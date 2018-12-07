# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import frappe


def _groupby(key, list_of_dicts):
    from itertools import groupby
    from operator import itemgetter

    keywise = {}
    for k, v in groupby(
        sorted(list_of_dicts, key=itemgetter(key)),
        itemgetter(key),
    ):
        keywise[k] = list(v)
    return keywise


@frappe.whitelist()
def get_more_pos_data():
    return {
        'batch_no_details': get_batch_no_details(),
        'uom_details': get_uom_details(),
        'exchange_rates': get_exchange_rates(),
    }


def get_batch_no_details():
    batches = frappe.db.sql(
        """
            SELECT name, item, expiry_date
            FROM `tabBatch`
            WHERE IFNULL(expiry_date, '4000-10-10') >= CURDATE()
            ORDER BY expiry_date
        """,
        as_dict=1,
    )
    return _groupby('item', batches)


def get_uom_details():
    uoms = frappe.db.sql(
        """
            SELECT
                parent AS item_code,
                uom,
                conversion_factor
            FROM `tabUOM Conversion Detail`
        """,
        as_dict=1
    )
    return _groupby('item_code', uoms)


def _merge_dicts(x, y):
    z = x.copy()
    z.update(y)
    return z


def get_exchange_rates():
    from erpnext.setup.utils import get_exchange_rate
    mops = frappe.db.sql(
        """
            SELECT
                name AS mode_of_payment,
                alt_currency AS currency
            FROM `tabMode of Payment`
            WHERE in_alt_currency=1
        """,
        as_dict=1
    )
    return {mop.mode_of_payment: mop for mop in map(lambda x: _merge_dicts(
        x,
        {
            'conversion_rate': get_exchange_rate(
                x.currency,
                frappe.defaults.get_user_default('currency'),
            ),
        }
    ), mops)}
