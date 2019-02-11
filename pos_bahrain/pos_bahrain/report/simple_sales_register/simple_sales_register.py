# Copyright (c) 2013, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from functools import partial
from toolz import compose, pluck, get, concatv


def execute(filters=None):
    columns_with_keys = _get_columns()
    columns = compose(list, partial(pluck, "label"))(columns_with_keys)
    keys = compose(list, partial(pluck, "key"))(columns_with_keys)
    data = _get_data(_get_clauses(filters), filters, keys)
    return columns, data


def _get_columns():
    columns = [
        {"key": "posting_date", "label": _("Date") + ":Date:90"},
        {"key": "invoice", "label": _("Invoice No") + ":Link/Sales Invoice:120"},
        {"key": "customer", "label": _("Customer") + ":Link/Customer:120"},
        {"key": "total", "label": _("Total") + ":Currency:120"},
        {"key": "discount", "label": _("Discount") + ":Currency:120"},
        {"key": "net_total", "label": _("Net Total") + ":Currency:120"},
        {"key": "tax", "label": _("Tax") + ":Currency:120"},
        {"key": "grand_total", "label": _("Grand Total") + ":Currency:120"},
    ]
    return columns


def _get_clauses(filters):
    if not filters.get("company"):
        frappe.throw(_("Company is required to generate report"))
    invoice_type = {"Sales": 0, "Returns": 1}
    clauses = concatv(
        [
            "docstatus = 1",
            "company = %(company)s",
            "posting_date BETWEEN %(from_date)s AND %(to_date)s",
        ],
        ["customer = %(customer)s"] if filters.get("customer") else [],
        ["is_return = {}".format(invoice_type[filters.get("invoice_type")])]
        if filters.get("invoice_type") in invoice_type
        else [],
    )
    return " AND ".join(clauses)


def _get_data(clauses, args, keys):
    items = frappe.db.sql(
        """
            SELECT
                posting_date,
                name AS invoice,
                customer,
                base_total AS total,
                base_discount_amount AS discount,
                base_net_total AS net_total,
                base_total_taxes_and_charges AS tax,
                base_grand_total AS grand_total
            FROM `tabSales Invoice`
            WHERE {clauses}
        """.format(
            clauses=clauses
        ),
        values=args,
        as_dict=1,
    )
    return map(partial(get, keys), items)
