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
