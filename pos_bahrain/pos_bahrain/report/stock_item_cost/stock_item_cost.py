# Copyright (c) 2013, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from pos_bahrain.utils.report import make_column
from functools import partial
from toolz import pluck, compose, concatv, merge, groupby, valmap


def execute(filters=None):
    columns, data = _get_columns(), _get_data(filters)
    return columns, data


def _get_columns():
    return list(
        concatv(
            [
                make_column(
                    "parent_item_group",
                    "Parent Item Group",
                    "Link",
                    options="Item Group",
                ),
                make_column(
                    "item_group",
                    "Item Group",
                    "Link",
                    options="Item Group",
                ),
                make_column(
                    "name",
                    "Item Code",
                    "Link",
                    options="Item",
                ),
                make_column("description", "Description", width=350),
                make_column("barcode", "Barcode", width=180),
            ],
            [
                make_column(_get_key(x), x, "Float")
                for x in _get_warehouses()
            ],
            [
                make_column("qty_sold", "Qty Sold", "Float"),
                make_column("sold_valuation", "Sold Valuation", "Currency"),
            ]
        )
    )


def _get_data(filters):
    items = _get_items()

    def get_merged_data(rows):
        item_barcodes = _get_item_barcodes()
        item_stocks = compose(
            partial(valmap, lambda x: {_get_key(z.get('warehouse')): z.get('actual_qty') for z in x}),
            partial(groupby, 'item_code'),
            lambda: _get_item_stocks()
        )()
        items_sold = _get_items_sold(filters)
        return compose(
            list,
            partial(map, lambda x: merge(x, {'qty_sold': items_sold.get(x.get('name'), 0.00)})),
            partial(map, lambda x: merge(x, item_stocks.get(x.get('name'), {}))),
            partial(map, lambda x: merge(x, {'barcode': item_barcodes.get(x.get('name'))}))
        )(rows)

    return get_merged_data(items)


def _get_items():
    return frappe.db.sql(
        """
            SELECT
                i.name,
                i.description,
                i.item_group,
                ig.parent_item_group
            FROM `tabItem` i
            JOIN `tabItem Group` ig ON ig.name = i.item_group
            ORDER BY i.name
        """,
        as_dict=1,
    )


def _get_items_sold(filters):
    items_sold = frappe.db.sql(
        """
            SELECT
                item_code,
                SUM(qty) as qty
            FROM `tabSales Invoice Item` sii
            INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
            WHERE si.docstatus = 1
            AND si.posting_date BETWEEN %(from_date)s AND %(to_date)s
            GROUP BY item_code
        """,
        filters,
        as_dict=1
    )
    return {x.get('item_code'): x.get('qty') for x in items_sold}


def _get_item_barcodes():
    item_barcodes = frappe.db.get_all("Item Barcode", fields=["parent", "barcode"])
    return {x.get("parent"): x.get("barcode") for x in item_barcodes}


def _get_item_stocks():
    return frappe.db.get_all(
        "Bin",
        fields=["warehouse", "item_code", "actual_qty"]
    )


def _get_warehouses():
    return compose(list, partial(pluck, "name"))(
        frappe.db.get_all(
            "Warehouse", filters={"is_group": 0}, fields=["name"]
        )
    )


def _get_key(text):
    return text.lower().replace(" ", "_").replace("-", "_")
