# Copyright (c) 2013, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.utils import today, getdate
from functools import partial
from toolz import merge, pluck, get, compose


def execute(filters=None):
    args = _get_args(filters)
    columns_with_keys = _get_columns(args)
    columns = compose(list, partial(pluck, "label"))(columns_with_keys)
    data = _get_data(args, columns_with_keys)
    return columns, data


def _get_args(filters={}):
    if not filters.get("company"):
        frappe.throw(_("Company is required to generate report"))
    if not filters.get("price_list1") or not filters.get("price_list2"):
        frappe.throw(_("Price Lists are required to generate report"))
    return merge(filters, {"query_date": filters.get("query_date") or today()})


def _get_columns(args):
    columns = [
        {"key": "supplier", "label": _("Supplier") + ":Link/Supplier:120"},
        {"key": "brand", "label": _("Brand") + ":Link/Brand:120"},
        {"key": "item_code", "label": _("Item Code") + ":Link/Item:120"},
        {"key": "item_name", "label": _("Item Name") + "::200"},
        {"key": "batch_no", "label": _("Batch") + ":Link/Batch:120"},
        {"key": "expiry_date", "label": _("Expiry Date") + ":Date:90"},
        {"key": "expiry_in_days", "label": _("Expiry in Days") + ":Int:90"},
        {"key": "qty", "label": _("Quantity") + ":Float:90"},
        {"key": "price1", "label": args.get("price_list1", "") + ":Currency:120"},
        {"key": "price2", "label": args.get("price_list2", "") + ":Currency:120"},
    ]
    return columns


def _get_data(args, columns):
    sles = frappe.db.sql(
        """
            SELECT
                sle.batch_no AS batch_no,
                sle.item_code AS item_code,
                sle.warehouse AS warehouse,
                SUM(sle.actual_qty) AS qty,
                i.item_name AS item_name,
                i.brand AS brand,
                i.default_supplier AS supplier,
                b.expiry_date AS expiry_date,
                p1.price_list_rate AS price1,
                p2.price_list_rate AS price2
            FROM `tabStock Ledger Entry` AS sle
            LEFT JOIN `tabItem` AS i ON
                i.item_code = sle.item_code
            LEFT JOIN `tabBatch` AS b ON
                b.batch_id = sle.batch_no
            LEFT JOIN `tabItem Price` AS p1 ON
                p1.item_code = sle.item_code AND
                p1.price_list = %(price_list1)s
            LEFT JOIN `tabItem Price` AS p2 ON
                p2.item_code = sle.item_code AND
                p2.price_list = %(price_list2)s
            WHERE
                sle.docstatus = 1 AND
                sle.company = %(company)s AND
                sle.posting_date <= %(query_date)s AND
                IFNULL(sle.batch_no, '') != ''
            GROUP BY sle.batch_no, sle.warehouse
            ORDER BY sle.item_code, sle.warehouse
        """,
        values=args,
        as_dict=1,
    )

    def set_expiry(row):
        expiry_in_days = (row.expiry_date - getdate()).days if row.expiry_date else None
        return merge(row, {"expiry_in_days": expiry_in_days})

    keys = compose(list, partial(pluck, "key"))(columns)
    make_row = compose(partial(get, keys), set_expiry)

    return map(make_row, sles)
