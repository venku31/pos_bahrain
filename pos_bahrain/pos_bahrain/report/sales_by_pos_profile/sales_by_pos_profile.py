# Copyright (c) 2013, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from functools import partial, reduce
from toolz import compose, pluck, concatv, keyfilter, valmap, groupby, merge

from pos_bahrain.utils import sum_by


def execute(filters=None):
    columns = _get_columns(filters)
    keys = compose(list, partial(pluck, "fieldname"))(columns)
    clauses, values = _get_filters(filters)
    data = _get_data(clauses, values, keys)
    return columns, data


def _get_columns(filters):
    def make_column(key, label=None, type="Data", options=None, width=120):
        return {
            "label": _(label or key.replace("_", " ").title()),
            "fieldname": key,
            "fieldtype": type,
            "options": options,
            "width": width,
        }

    mops = pluck("name", frappe.get_all("Mode of Payment"))
    join = compose(list, concatv)
    return join(
        [make_column("pos_profile", type="Link", options="POS Profile")],
        [
            make_column("sales_invoice", type="Link", options="Sales Invoice"),
            make_column("posting_date", type="Date", width=90),
        ]
        if not filters.summary_view
        else [],
        [make_column("grand_total", type="Currency")],
        [make_column(x, type="Currency") for x in mops],
    )


def _get_filters(filters):
    join = compose(lambda x: " AND ".join(x), list, concatv)
    clauses = join(
        [
            "si.docstatus = 1",
            "si.is_pos = 1",
            "si.posting_date BETWEEN %(from_date)s AND %(to_date)s",
        ],
        ["si.pos_profile = %(pos_profile)s"] if filters.pos_profile else [],
    )
    return {"clauses": clauses}, filters


def _get_data(clauses, values, keys):
    query = (
        """
            SELECT
                si.pos_profile AS pos_profile,
                SUM(si.grand_total) AS grand_total
            FROM `tabSales Invoice` AS si
            WHERE {clauses}
            GROUP BY si.pos_profile
        """
        if values.summary_view
        else """
            SELECT
                si.pos_profile AS pos_profile,
                si.name AS sales_invoice,
                si.posting_date AS posting_date,
                si.grand_total AS grand_total
            FROM `tabSales Invoice` AS si
            WHERE {clauses}
            ORDER BY si.posting_date
        """
    )
    rows = frappe.db.sql(query.format(**clauses), values=values, as_dict=1)

    payments = frappe.db.sql(
        """
            SELECT
                si.name AS sales_invoice,
                si.pos_profile AS pos_profile,
                sip.mode_of_payment AS mode_of_payment,
                sip.base_amount AS amount
            FROM `tabSales Invoice Payment` AS sip
            LEFT JOIN `tabSales Invoice` as si ON sip.parent = si.name
            WHERE {clauses}
        """.format(
            **clauses
        ),
        values=values,
        as_dict=1,
    )

    make_row = compose(
        partial(keyfilter, lambda k: k in keys),
        _add_mops(payments, values.summary_view),
    )
    return [make_row(x) for x in rows]


def _add_mops(payments, summary_view):
    payments_by_mop = groupby("mode_of_payment", payments)
    mops = payments_by_mop.keys()

    group_field = "pos_profile" if summary_view else "sales_invoice"
    groupped_payments_by_mop = valmap(partial(groupby, group_field), payments_by_mop)

    def get_amount(row, mop):
        key = row.get(group_field)
        return sum_by("amount", groupped_payments_by_mop.get(mop, {}).get(key, []))

    def fn(row):
        return merge(
            row, reduce(lambda a, x: merge(a, {x: get_amount(row, x)}), mops, {})
        )

    return fn
