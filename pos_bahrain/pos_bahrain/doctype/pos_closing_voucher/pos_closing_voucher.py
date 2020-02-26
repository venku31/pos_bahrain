# -*- coding: utf-8 -*-
# Copyright (c) 2018, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.utils import get_datetime, flt, cint
from frappe.model.document import Document
from functools import partial
from toolz import merge, compose, pluck, excepts, first

from pos_bahrain.utils import pick, sum_by


class POSClosingVoucher(Document):
    def validate(self):
        existing = frappe.db.sql(
            """
                SELECT 1 FROM `tabPOS Closing Voucher`
                WHERE
                    docstatus = 1 AND
                    name != %(name)s AND
                    company = %(company)s AND
                    pos_profile = %(pos_profile)s AND
                    user = %(user)s AND
                    period_from <= %(period_to)s AND
                    period_to >= %(period_from)s
            """,
            values={
                "name": self.name,
                "company": self.company,
                "pos_profile": self.pos_profile,
                "user": self.user,
                "period_from": get_datetime(self.period_from),
                "period_to": get_datetime(self.period_to),
            },
        )
        if existing:
            frappe.throw(
                "Another POS Closing Voucher already exists during this time frame."
            )

    def before_insert(self):
        if not self.period_from:
            self.period_from = get_datetime()

    def before_submit(self):
        if not self.period_to:
            self.period_to = get_datetime()
        self.set_report_details()
        get_default_collected = compose(
            lambda x: x.collected_amount if x else 0,
            excepts(StopIteration, first, lambda x: None),
            partial(filter, lambda x: cint(x.is_default) == 1),
        )
        self.closing_amount = self.opening_amount + get_default_collected(self.payments)

    def set_report_details(self):
        args = merge(
            pick(["user", "pos_profile", "company"], self.as_dict()),
            {
                "period_from": get_datetime(self.period_from),
                "period_to": get_datetime(self.period_to),
            },
        )

        sales, returns = _get_invoices(args)
        actual_payments = _get_payments(args)
        taxes = _get_taxes(args)

        def make_invoice(invoice):
            return merge(
                pick(["grand_total", "paid_amount", "change_amount"], invoice),
                {"invoice": invoice.name, "total_qty": invoice.pos_total_qty},
            )

        def make_payment(payment):
            mop_conversion_rate = (
                payment.amount / payment.mop_amount if payment.mop_amount else 1
            )
            expected_amount = (
                payment.amount - sum_by("change_amount", sales)
                if payment.is_default
                else (payment.mop_amount or payment.amount)
            )
            return merge(
                pick(["is_default", "mode_of_payment", "type"], payment),
                {
                    "mop_conversion_rate": mop_conversion_rate,
                    "collected_amount": expected_amount,
                    "expected_amount": expected_amount,
                    "difference_amount": 0,
                    "mop_currency": payment.mop_currency
                    or frappe.defaults.get_global_default("currency"),
                    "base_collected_amount": expected_amount * flt(mop_conversion_rate),
                },
            )

        make_tax = partial(pick, ["rate", "tax_amount"])

        self.returns_total = sum_by("grand_total", returns)
        self.returns_net_total = sum_by("net_total", returns)
        self.grand_total = sum_by("grand_total", sales + returns)
        self.net_total = sum_by("net_total", sales + returns)
        self.outstanding_total = sum_by("outstanding_amount", sales)
        self.total_invoices = len(sales + returns)
        self.average_sales = sum_by("net_total", sales) / len(sales) if sales else 0
        self.total_quantity = sum_by("pos_total_qty", sales)
        self.returns_quantity = -sum_by("pos_total_qty", returns)
        self.tax_total = sum_by("tax_amount", taxes)
        self.discount_total = sum_by("discount_amount", sales)
        self.change_total = sum_by("change_amount", sales)
        self.total_collected = sum_by("amount", actual_payments) - self.change_total

        self.invoices = []
        for invoice in sales:
            self.append("invoices", make_invoice(invoice))
        self.returns = []
        for invoice in returns:
            self.append("returns", make_invoice(invoice))

        existing_payments = self.payments

        def get_form_collected(mop):
            existing = compose(
                excepts(StopIteration, first, lambda x: None),
                partial(filter, lambda x: x.mode_of_payment == mop),
            )(existing_payments)
            if not existing or existing.collected_amount == existing.expected_amount:
                return {}
            return {"collected_amount": existing.collected_amount}

        self.payments = []
        for payment in actual_payments:
            self.append(
                "payments",
                merge(
                    make_payment(payment), get_form_collected(payment.mode_of_payment)
                ),
            )
        self.taxes = []
        for tax in taxes:
            self.append("taxes", make_tax(tax))


def _get_clauses():
    clauses = [
        "si.docstatus = 1",
        "si.is_pos = 1",
        "si.pos_profile = %(pos_profile)s",
        "si.owner = %(user)s",
        "si.company = %(company)s",
        "TIMESTAMP(si.posting_date, si.posting_time) BETWEEN %(period_from)s AND %(period_to)s",  # noqa
    ]
    return " AND ".join(clauses)


def _get_invoices(args):
    sales = frappe.db.sql(
        """
            SELECT
                si.name AS name,
                si.pos_total_qty AS pos_total_qty,
                si.base_grand_total AS grand_total,
                si.base_net_total AS net_total,
                si.base_discount_amount AS discount_amount,
                si.outstanding_amount AS outstanding_amount,
                si.paid_amount AS paid_amount,
                si.change_amount AS change_amount
            FROM `tabSales Invoice` AS si
            WHERE {clauses} AND is_return != 1
        """.format(
            clauses=_get_clauses()
        ),
        values=args,
        as_dict=1,
    )
    returns = frappe.db.sql(
        """
            SELECT
                si.name AS name,
                si.pos_total_qty AS pos_total_qty,
                si.base_grand_total AS grand_total,
                si.base_net_total AS net_total,
                si.base_discount_amount AS discount_amount,
                si.paid_amount AS paid_amount,
                si.change_amount AS change_amount
            FROM `tabSales Invoice` As si
            WHERE {clauses} AND is_return = 1
        """.format(
            clauses=_get_clauses()
        ),
        values=args,
        as_dict=1,
    )
    return sales, returns


def _get_payments(args):
    payments = frappe.db.sql(
        """
            SELECT
                sip.mode_of_payment AS mode_of_payment,
                sip.type AS type,
                SUM(sip.base_amount) AS amount,
                sip.mop_currency AS mop_currency,
                SUM(sip.mop_amount) AS mop_amount
            FROM `tabSales Invoice Payment` AS sip
            LEFT JOIN `tabSales Invoice` AS si ON
                sip.parent = si.name
            WHERE sip.parenttype = 'Sales Invoice' AND {clauses}
            GROUP BY sip.mode_of_payment
        """.format(
            clauses=_get_clauses()
        ),
        values=args,
        as_dict=1,
    )
    default_mop = compose(
        excepts(StopIteration, first, lambda __: None),
        partial(pluck, "mode_of_payment"),
        frappe.get_all,
    )(
        "Sales Invoice Payment",
        fields=["mode_of_payment"],
        filters={
            "parenttype": "POS Profile",
            "parent": args.get("pos_profile"),
            "default": 1,
        },
    )
    return _correct_mop_amounts(payments, default_mop)


def _correct_mop_amounts(payments, default_mop):
    """
        Correct conversion_rate for MOPs using base currency.
        Required because conversion_rate is calculated as
            base_amount / mop_amount
        for MOPs using alternate currencies.
    """
    base_mops = compose(list, partial(pluck, "name"), frappe.get_all)(
        "Mode of Payment", filters={"in_alt_currency": 0}
    )
    base_currency = frappe.defaults.get_global_default("currency")

    def correct(payment):
        return frappe._dict(
            merge(
                payment,
                {"is_default": 1 if payment.mode_of_payment == default_mop else 0},
                {"mop_amount": payment.base_amount, "mop_currency": base_currency}
                if payment.mode_of_payment in base_mops
                else {},
            )
        )

    return [correct(x) for x in payments]


def _get_taxes(args):
    taxes = frappe.db.sql(
        """
            SELECT
                stc.rate AS rate,
                SUM(stc.base_tax_amount_after_discount_amount) AS tax_amount
            FROM `tabSales Taxes and Charges` AS stc
            LEFT JOIN `tabSales Invoice` AS si ON
                stc.parent = si.name
            WHERE stc.parenttype = 'Sales Invoice' AND {clauses}
            GROUP BY stc.rate
        """.format(
            clauses=_get_clauses()
        ),
        values=args,
        as_dict=1,
    )
    return taxes
