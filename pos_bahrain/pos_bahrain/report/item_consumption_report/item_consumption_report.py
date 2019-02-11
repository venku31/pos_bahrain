# Copyright (c) 2013,     9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.utils import today
from functools import partial, reduce
import operator
from toolz import merge, pluck, get, compose, first, flip, groupby, excepts

from pos_bahrain.pos_bahrain.report.item_consumption_report.helpers import (
    generate_intervals,
)


def execute(filters=None):
    args = _get_args(filters)
    columns_with_keys = _get_columns(args)
    columns = compose(list, partial(pluck, "label"))(columns_with_keys)
    data = _get_data(args, columns_with_keys)
    return columns, data


def _get_args(filters={}):
    if not filters.get("company"):
        frappe.throw(_("Company is required to generate report"))
    return merge(
        filters,
        {
            "price_list": frappe.db.get_value(
                "Buying Settings", None, "buying_price_list"
            ),
            "start_date": filters.get("start_date") or today(),
            "end_date": filters.get("end_date") or today(),
        },
    )


def _get_columns(args):
    columns = [
        {"key": "item_code", "label": _("Item Code") + ":Link/Item:120"},
        {"key": "brand", "label": _("Brand") + ":Link/Brand:120"},
        {"key": "item_name", "label": _("Item Name") + "::200"},
        {"key": "supplier", "label": _("Supplier") + ":Link/Supplier:120"},
        {
            "key": "price",
            "label": args.get("price_list", "Standard Buying Price") + ":Currency:120",
        },
        {"key": "stock", "label": _("Available Stock") + ":Float:90"},
    ]
    intervals = compose(
        partial(map, lambda x: merge(x, {"label": x.get("label") + ":Float:90"})),
        generate_intervals,
    )
    return (
        columns
        + intervals(args.get("interval"), args.get("start_date"), args.get("end_date"))
        + [{"key": "total_consumption", "label": _("Total Consumption") + ":Float:90"}]
    )


def _get_data(args, columns):
    items = frappe.db.sql(
        """
            SELECT
                i.item_code AS item_code,
                i.brand AS brand,
                i.item_name AS item_name,
                id.default_supplier AS supplier,
                p.price_list_rate AS price,
                b.actual_qty AS stock
            FROM `tabItem` AS i
            LEFT JOIN `tabItem Price` AS p
                ON p.item_code = i.item_code AND p.price_list = %(price_list)s
            LEFT JOIN (
                SELECT
                    item_code, SUM(actual_qty) AS actual_qty
                FROM `tabBin`
                WHERE warehouse IN (
                    SELECT name FROM `tabWarehouse` WHERE company = %(company)s
                )
                GROUP BY item_code
            ) AS b
                ON b.item_code = i.item_code
            LEFT JOIN `tabItem Default` AS id
                ON id.parent = i.name AND id.company = %(company)s
        """,
        values={"price_list": args.get("price_list"), "company": args.get("company")},
        as_dict=1,
    )
    sles = frappe.db.sql(
        """
            SELECT item_code, posting_date, actual_qty
            FROM `tabStock Ledger Entry`
            WHERE docstatus < 2 AND
                voucher_type = 'Sales Invoice' AND
                company = %(company)s AND
                warehouse = %(warehouse)s AND
                posting_date BETWEEN %(start_date)s AND %(end_date)s
        """,
        values={
            "company": args.get("company"),
            "warehouse": args.get("warehouse"),
            "start_date": args.get("start_date"),
            "end_date": args.get("end_date"),
        },
        as_dict=1,
    )
    keys = compose(list, partial(pluck, "key"))(columns)
    periods = filter(lambda x: x.get("start_date") and x.get("end_date"), columns)

    set_consumption = _set_consumption(sles, periods)

    def make_row(item):
        return compose(partial(get, keys), set_consumption)(item)

    return map(make_row, items)


def _set_consumption(sles, periods):
    def groupby_filter(sl):
        def fn(p):
            return p.get("start_date") <= sl.get("posting_date") <= p.get("end_date")

        return fn

    groupby_fn = compose(
        partial(get, "key", default=None),
        excepts(StopIteration, first, lambda __: {}),
        partial(flip, filter, periods),
        groupby_filter,
    )

    sles_grouped = groupby(groupby_fn, sles)

    summer = compose(operator.neg, sum, partial(pluck, "actual_qty"))

    def seg_filter(x):
        return lambda sl: sl.get("item_code") == x

    segregator_fns = map(
        lambda x: merge(
            x,
            {
                "seger": compose(
                    summer,
                    partial(flip, filter, get(x.get("key"), sles_grouped, [])),
                    seg_filter,
                )
            },
        ),
        periods,
    )

    def seg_reducer(item_code):
        def fn(a, p):
            key = get("key", p, None)
            seger = get("seger", p, lambda __: None)
            return merge(a, {key: seger(item_code)})

        return fn

    total_fn = compose(summer, partial(flip, filter, sles), seg_filter)

    def fn(item):
        item_code = item.get("item_code")
        return merge(
            item,
            reduce(seg_reducer(item_code), segregator_fns, {}),
            {"total_consumption": total_fn(item_code)},
        )

    return fn
