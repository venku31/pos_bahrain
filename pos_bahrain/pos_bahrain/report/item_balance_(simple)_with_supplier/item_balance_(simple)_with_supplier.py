# Copyright (c) 2013, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from functools import partial
from toolz import compose, pluck, merge, concatv

from pos_bahrain.utils import pick


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

    return [
        make_column("item_code", "Item Code", type="Link", options="Item"),
        make_column("item_name", "Item Name", width=150),
        make_column("item_group", "Item Group", type="Link", options="Item Group"),
        make_column("brand", "Brand", type="Link", options="Brand"),
        make_column("supplier", "Default Supplier", type="Link", options="Supplier"),
        make_column("qty", "Balance Qty", type="Float"),
    ]


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
    return (
        {
            "clauses": " AND ".join(clauses),
            "bin_clauses": " AND ".join(bin_clauses),
            "defaults_clauses": " AND ".join(defaults_clauses),
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
                i.brand AS brand,
                id.default_supplier AS supplier,
                SUM(b.actual_qty) AS qty
            FROM `tabItem` AS i
            LEFT JOIN `tabBin` AS b ON {bin_clauses}
            LEFT JOIN `tabItem Default` AS id ON {defaults_clauses}
            WHERE {clauses}
            GROUP BY i.item_code
        """.format(
            **clauses
        ),
        values=values,
        as_dict=1,
    )

    make_row = partial(pick, keys)
    return [make_row(x) for x in result]
