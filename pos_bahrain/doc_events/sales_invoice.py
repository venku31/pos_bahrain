# -*- coding: utf-8 -*-
# Copyright (c) 2018, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.utils import flt, today
from erpnext.setup.utils import get_exchange_rate
from pos_bahrain.api.sales_invoice import get_customer_account_balance
from toolz import first


def validate(doc, method):
    if (
        doc.is_pos
        and not doc.is_return
        and not doc.amended_from
        and doc.offline_pos_name
        and frappe.db.exists(
            "Sales Invoice",
            {"offline_pos_name": doc.offline_pos_name, "name": ("!=", doc.name)},
        )
    ):
        frappe.throw("Cannot create duplicate offline POS invoice")
    for payment in doc.payments:
        if payment.amount:
            bank_method = frappe.get_cached_value(
                "Mode of Payment", payment.mode_of_payment, "pb_bank_method"
            )
            if bank_method and not payment.pb_reference_no:
                frappe.throw(
                    "Reference Number necessary in payment row #{}".format(payment.idx)
                )
            if bank_method == "Cheque" and not payment.pb_reference_date:
                frappe.throw(
                    "Reference Date necessary in payment row #{}".format(payment.idx)
                )

    doc.pb_available_balance = get_customer_account_balance(doc.customer)


def before_save(doc, method):
    set_cost_center(doc)
    set_location(doc)


def on_submit(doc, method):
    for payment in doc.payments:
        if not payment.mop_currency:
            currency = frappe.db.get_value(
                "Mode of Payment", payment.mode_of_payment, "alt_currency"
            )
            conversion_rate = (
                get_exchange_rate(
                    currency, frappe.defaults.get_user_default("currency")
                )
                if currency
                else 1.0
            )
            frappe.db.set_value(
                "Sales Invoice Payment",
                payment.name,
                "mop_currency",
                currency or frappe.defaults.get_user_default("currency"),
            )
            frappe.db.set_value(
                "Sales Invoice Payment",
                payment.name,
                "mop_conversion_rate",
                conversion_rate,
            )
            frappe.db.set_value(
                "Sales Invoice Payment",
                payment.name,
                "mop_amount",
                flt(payment.base_amount) / flt(conversion_rate),
            )

    _make_gl_entry_for_provision_credit(doc)
    _make_gl_entry_on_credit_issued(doc)


def before_cancel(doc, method):
    parent = _get_parent_by_account(doc.name)
    if not parent:
        return

    je_doc = frappe.get_doc("Journal Entry", parent)
    je_doc.cancel()


def _get_parent_by_account(name):
    data = frappe.db.sql(
        """
        SELECT je.name 
        FROM `tabJournal Entry` je
        JOIN `tabJournal Entry Account` jea
        ON jea.parent = je.name
        WHERE jea.reference_type = "Sales Invoice"
        AND jea.reference_name = %s
        """,
        name,
        as_dict=1,
    )
    if not data:
        return

    provision_account = frappe.db.get_single_value(
        "POS Bahrain Settings",
        "credit_note_provision_account",
    )
    if not provision_account:
        return

    je_name = data[0].get("name")
    provision_account = frappe.db.sql(
        """
        SELECT 1 FROM `tabJournal Entry Account`
        WHERE parent = %s
        AND account = %s
        """,
        (je_name, provision_account),
    )

    return je_name if provision_account else None


def set_cost_center(doc):
    if doc.pb_set_cost_center:
        for row in doc.items:
            row.cost_center = doc.pb_set_cost_center
        for row in doc.taxes:
            row.cost_center = doc.pb_set_cost_center


def set_location(doc):
    for row in doc.items:
        row.pb_location = _get_location(row.item_code, row.warehouse)


def _get_location(item_code, warehouse):
    locations = frappe.get_all(
        "Item Storage Location",
        filters={"parent": item_code, "warehouse": warehouse},
        fields=["storage_location"],
    )

    location = None
    if locations:
        location = first(locations).get("storage_location")

    return location


def _make_gl_entry_on_credit_issued(doc):
    if doc.is_return or doc.is_pos:
        return

    provision_account = frappe.db.get_single_value(
        "POS Bahrain Settings", "credit_note_provision_account"
    )
    if not provision_account:
        return

    account_balance = get_customer_account_balance(doc.customer)
    if not account_balance:
        return

    carry_over = (
        account_balance
        if account_balance < doc.outstanding_amount
        else doc.outstanding_amount
    )

    je_doc = frappe.new_doc("Journal Entry")
    je_doc.posting_date = today()
    je_doc.append(
        "accounts",
        {
            "account": doc.debit_to,
            "party_type": "Customer",
            "party": doc.customer,
            "debit_in_account_currency": 0,
            "credit_in_account_currency": carry_over,
            "reference_type": "Sales Invoice",
            "reference_name": doc.name,
        },
    )
    je_doc.append(
        "accounts",
        {
            "account": provision_account,
            "party_type": "Customer",
            "party": doc.customer,
            "debit_in_account_currency": carry_over,
            "credit_in_account_currency": 0,
        },
    )

    je_doc.save()
    je_doc.submit()


def _make_gl_entry_for_provision_credit(doc):
    if not doc.is_return or doc.is_pos:
        return

    provision_account = frappe.db.get_single_value(
        "POS Bahrain Settings", "credit_note_provision_account"
    )
    if not provision_account:
        return

    account_balance = get_customer_account_balance(doc.customer)
    if not account_balance:
        return

    je_doc = frappe.new_doc("Journal Entry")
    je_doc.posting_date = today()
    je_doc.append(
        "accounts",
        {
            "account": provision_account,
            "party_type": "Customer",
            "party": doc.customer,
            "debit_in_account_currency": 0,
            "credit_in_account_currency": abs(doc.grand_total),
        },
    )
    je_doc.append(
        "accounts",
        {
            "account": doc.debit_to,
            "party_type": "Customer",
            "party": doc.customer,
            "debit_in_account_currency": abs(doc.grand_total),
            "credit_in_account_currency": 0,
        },
    )

    je_doc.save()
    je_doc.submit()
