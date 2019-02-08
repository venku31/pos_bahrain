# Copyright (c) 2013, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from functools import partial
from toolz import compose, merge, pluck, get


def execute(filters=None):
    columns_with_keys = _get_columns()
    columns = compose(list, partial(pluck, "label"))(columns_with_keys)
    keys = compose(list, partial(pluck, "key"))(columns_with_keys)
    data = _get_data(_get_clauses(filters), filters, keys)
    return columns, data


def _get_columns():
    columns = [
        {"key": "customer", "label": _("Customer") + ":Link/Customer:120"},
        {"key": "item_code", "label": _("Item Code") + ":Link/Item:120"},
        {"key": "item_name", "label": _("Item Name") + "::180"},
        {"key": "qty", "label": _("Qty") + ":Float:90"},
        {"key": "rate", "label": _("Rate") + ":Currency:120"},
        {"key": "gross", "label": _("Gross") + ":Currency:120"},
    ]
    return columns


def _get_clauses(filters):
    clauses = [
        "si.docstatus = 1",
        "si.is_return = 0",
        "si.posting_date BETWEEN %(from_date)s AND %(to_date)s",
    ]
    if filters.get("customer"):
        clauses.append("si.customer = %(customer)s")
    return " AND ".join(clauses)


def _get_data(clauses, args, keys):
    items = frappe.db.sql(
        """
            SELECT
                si.customer AS customer,
                sii.item_code AS item_code,
                sii.item_name AS item_name,
                SUM(sii.qty) AS qty,
                SUM(sii.amount) AS gross
            FROM `tabSales Invoice Item` AS sii
            LEFT JOIN `tabSales Invoice` AS si ON sii.parent = si.name
            WHERE {clauses}
            GROUP BY si.customer, sii.item_code
        """.format(
            clauses=clauses
        ),
        values=args,
        as_dict=1,
    )

    def add_rate(row):
        return merge(row, {"rate": row.gross / row.qty})

    make_row = compose(partial(get, keys), add_rate)

    return map(make_row, items)
