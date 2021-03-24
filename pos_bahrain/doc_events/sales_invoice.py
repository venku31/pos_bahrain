# -*- coding: utf-8 -*-
# Copyright (c) 2018, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.utils import flt
from erpnext.setup.utils import get_exchange_rate
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

    set_rate_by_item_price_list(doc)


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


def set_cost_center(doc):
    if doc.pb_set_cost_center:
        for row in doc.items:
            row.cost_center = doc.pb_set_cost_center
        for row in doc.taxes:
            row.cost_center = doc.pb_set_cost_center


def set_location(doc):
    for row in doc.items:
        row.pb_location = _get_location(row.item_code, row.warehouse)


def set_rate_by_item_price_list(doc):
    has_set = False
    for item in doc.items:
        if item.pb_price_list:
            price_list_rate = _get_item_price_list_rate(item.item_code, item.pb_price_list)
            item.rate = price_list_rate
            item.price_list_rate = price_list_rate
            item.discount_amount = 0
            item.discount_percentage = 0
            has_set = True

    if has_set:
        doc.calculate_taxes_and_totals()
        frappe.msgprint(_("Some items are updated based on Price List set on Item row"))


def _get_item_price_list_rate(item_code, price_list):
    item_price = frappe.db.sql(
        """
        SELECT price_list_rate FROM `tabItem Price`
        WHERE item_code=%(item_code)s
        AND price_list=%(price_list)s
        AND selling=1
        """,
        {
            "item_code": item_code,
            "price_list": price_list
        },
        as_dict=True
    )
    if not item_price:
        frappe.throw(_("Unable to find Item Price of {} under {}".format(item_code, price_list)))
    return first(item_price).get("price_list_rate")


def _get_location(item_code, warehouse):
    locations = frappe.get_all(
        "Item Storage Location",
        filters={"parent": item_code, "warehouse": warehouse},
        fields=["storage_location"]
    )

    location = None
    if locations:
        location = first(locations).get("storage_location")

    return location
