# Copyright (c) 2013, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe

from functools import partial
from toolz import compose, groupby, valmap, keymap, merge

from pos_bahrain.utils import sum_by
from pos_bahrain.utils.report import make_column


def execute(filters=None):
    columns, data = _get_columns(), _get_data(filters)
    return columns, data


def _get_columns():
    return [
        make_column("hours", "Hours", "Data"),
        make_column(
            "no_of_sales",
            "No. of Sales",
            "Int",
        ),
        make_column(
            "total_qty",
            "Total Qty",
            "Int",
        ),
        make_column(
            "total",
            "Total",
            "Currency",
        ),
        make_column(
            "taxes_and_charges",
            "Taxes",
            "Currency",
        ),
        make_column(
            "discount_amount",
            "Discount",
            "Currency",
        ),
        make_column(
            "grand_total",
            "Grand Total",
            "Currency",
        ),
    ]


def _get_data(filters):
    def make_data(rows):
        return {
            "no_of_sales": len(rows),
            "total_qty": sum_by("total_qty", rows),
            "total": sum_by("total", rows),
            "taxes_and_charges": sum_by("total_taxes_and_charges", rows),
            "discount_amount": sum_by("discount_amount", rows),
            "grand_total": sum_by("grand_total", rows),
        }

    def by_hours(row):
        return _get_hours(row.get("posting_time"))

    def get_hours_text(hours):
        return "%s-%s" % (_get_12h_format(hours), _get_12h_format(hours + 1))

    data = compose(
        lambda x: [merge(z, {"hours": y}) for y, z in x.items()],
        partial(keymap, get_hours_text),
        partial(valmap, make_data),
        partial(groupby, by_hours),
    )

    return data(_get_invoices(filters.posting_date))


def _get_invoices(posting_date):
    return frappe.get_all(
        "Sales Invoice",
        filters={"posting_date": posting_date},
        fields=[
            "posting_time",
            "total",
            "total_qty",
            "total_taxes_and_charges",
            "discount_amount",
            "grand_total",
        ],
    )


def _get_hours(td):
    """
    Source
    https://stackoverflow.com/questions/2119472/convert-a-timedelta-to-days-hours-and-minutes
    """
    return td.seconds // 3600


def _get_12h_format(hours):
    if hours == 12:
        return "12nn"
    elif hours == 24:
        return "12mn"
    elif hours > 12:
        return "%dpm" % (hours - 12)
    return "%dam" % hours
