# Copyright (c) 2013, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from functools import partial, reduce
from toolz import compose, pluck, merge, concatv, concat, groupby

from pos_bahrain.utils import pick


NUM_OF_UOM_COLUMNS = 3


def execute(filters=None):
    columns = _get_columns()
    keys = compose(list, partial(pluck, "fieldname"))(columns)
    clauses, values = _get_filters(filters)
    data = _get_data(clauses, values, keys)
    return columns, data


def _get_columns():
    def make_column(key, label, type="Data", options=None, width=120):
        return {
            "label": _(label),
            "fieldname": key,
            "fieldtype": type,
            "options": options,
            "width": width,
        }

    join_columns = compose(list, concat)
    columns = [
        make_column("item_code", "Item Code", type="Link", options="Item"),
        make_column("item_name", "Item Name", width=150),
        make_column("item_group", "Item Group", type="Link", options="Item Group"),
        make_column("brand", "Brand", type="Link", options="Brand"),
        make_column("supplier", "Default Supplier", type="Link", options="Supplier"),
        make_column("supplier_part_no", "Supplier Part No"),
        make_column("stock_uom", "Stock UOM", width=90),
        make_column("qty", "Balance Qty", type="Float", width=90),
    ]

    def uom_columns(x):
        return [
            make_column("uom{}".format(x), "UOM {}".format(x), width=90),
            make_column(
                "cf{}".format(x),
                "Coversion Factor {}".format(x),
                type="Float",
                width=90,
            ),
            make_column("qty{}".format(x), "Qty {}".format(x), type="Float", width=90),
        ]

    return join_columns(
        [columns] + [uom_columns(x + 1) for x in range(0, NUM_OF_UOM_COLUMNS)]
    )


def _get_filters(filters):
    item_codes = (
        compose(
            list,
            partial(filter, lambda x: x),
            partial(map, lambda x: x.strip()),
            lambda x: x.split(","),
        )(filters.item_codes)
        if filters.item_codes
        else None
    )
    clauses = concatv(
        ["i.disabled = 0"], ["i.item_code IN %(item_codes)s"] if item_codes else []
    )
    bin_clauses = concatv(
        ["b.item_code = i.item_code"],
        ["b.warehouse = %(warehouse)s"] if filters.warehouse else [],
    )
    defaults_clauses = concatv(["id.parent = i.name"], ["id.company = %(company)s"])
    supplier_clauses = concatv(
        ["isp.parent = i.name"], ["isp.supplier = id.default_supplier"]
    )
    return (
        {
            "clauses": " AND ".join(clauses),
            "bin_clauses": " AND ".join(bin_clauses),
            "defaults_clauses": " AND ".join(defaults_clauses),
            "supplier_clauses": " AND ".join(supplier_clauses),
        },
        merge(filters, {"item_codes": item_codes} if item_codes else {}),
    )


def _get_data(clauses, values, keys):
    result = frappe.db.sql(
        """
            SELECT
                i.item_code AS item_code,
                i.item_name AS item_name,
                i.item_group AS item_group,
                i.stock_uom AS stock_uom,
                i.brand AS brand,
                id.default_supplier AS supplier,
                isp.supplier_part_no AS supplier_part_no,
                SUM(b.actual_qty) AS qty
            FROM `tabItem` AS i
            LEFT JOIN `tabBin` AS b ON {bin_clauses}
            LEFT JOIN `tabItem Default` AS id ON {defaults_clauses}
            LEFT JOIN `tabItem Supplier` AS isp ON {supplier_clauses}
            WHERE {clauses}
            GROUP BY i.item_code
        """.format(
            **clauses
        ),
        values=values,
        as_dict=1,
    )

    uoms_by_item_code = groupby(
        "item_code",
        frappe.db.sql(
            """
            SELECT
                i.name AS item_code,
                ucd.uom AS uom,
                ucd.conversion_factor AS conversion_factor
            FROM `tabUOM Conversion Detail` AS ucd
            LEFT JOIN `tabItem` AS i ON i.name = ucd.parent
            WHERE ucd.parent IN %(parent)s AND ucd.uom != i.stock_uom
        """,
            values={"parent": [x.get("item_code") for x in result]},
            as_dict=1,
        ),
    )

    def add_uom(row):
        def get_detail(i, detail):
            qty = row.get("qty") or 0
            return {
                "uom{}".format(i + 1): detail.get("uom"),
                "cf{}".format(i + 1): detail.get("conversion_factor"),
                "qty{}".format(i + 1): qty / detail.get("conversion_factor"),
            }

        details = uoms_by_item_code.get(row.get("item_code"), [])
        fields = reduce(lambda a, x: merge(a, get_detail(*x)), enumerate(details), {})
        return merge(row, fields)

    make_row = compose(partial(pick, keys), add_uom)
    return [make_row(x) for x in result]
