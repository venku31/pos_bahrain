# Copyright (c) 2013, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from functools import partial
from toolz import compose, pluck, get


def execute(filters=None):
    columns_with_keys = _get_columns(filters)
    columns = compose(list, partial(pluck, "label"))(columns_with_keys)
    keys = compose(list, partial(pluck, "key"))(columns_with_keys)
    data = _get_data(_get_clauses(filters), filters, keys)
    return columns, data


def _get_columns(filters):
    columns = (
        [
            {"key": "item_code", "label": _("Item Code") + ":Link/Item:120"},
            {"key": "item_name", "label": _("Item Name") + "::180"},
        ]
        if filters.get("salesman")
        else [{"key": "salesman_name", "label": _("Sales Person") + "::120"}]
    )
    columns += [
        {"key": "paid_qty", "label": _("Paid Qty") + ":Float:90"},
        {"key": "free_qty", "label": _("Free Qty") + ":Float:90"},
        {"key": "gross", "label": _("Gross") + ":Currency:120"},
    ]
    return columns


def _get_clauses(filters):
    clauses = [
        "si.docstatus = 1",
        "si.is_return = 0",
        "si.posting_date BETWEEN %(from_date)s AND %(to_date)s",
    ]
    if filters.get("salesman"):
        clauses.append("sii.salesman = %(salesman)s")
    return " AND ".join(clauses)


def _get_data(clauses, args, keys):
    items = frappe.db.sql(
        """
            SELECT
                sii.item_code AS item_code,
                sii.item_name AS item_name,
                SUM(siim.qty) AS paid_qty,
                SUM(siiz.qty) AS free_qty,
                SUM(sii.amount) AS gross,
                sii.salesman_name AS salesman_name
            FROM `tabSales Invoice Item` AS sii
            LEFT JOIN (
                SELECT name, qty FROM `tabSales Invoice Item` WHERE amount > 0
            ) AS siim ON siim.name = sii.name
            LEFT JOIN (
                SELECT name, qty FROM `tabSales Invoice Item` WHERE amount = 0
            ) AS siiz ON siiz.name = sii.name
            LEFT JOIN `tabSales Invoice` AS si ON sii.parent = si.name
            WHERE {clauses}
            GROUP BY {group_by}
        """.format(
            clauses=clauses,
            group_by="sii.item_code" if args.get("salesman") else "sii.salesman_name",
        ),
        values=args,
        as_dict=1,
    )

    return map(partial(get, keys), items)
