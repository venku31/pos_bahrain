# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import frappe


@frappe.whitelist()
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
    itemwise = {}
    for batch in batches:
        if batch.item not in itemwise:
            itemwise.setdefault(batch.item, [])
        itemwise[batch.item].append(batch)
    return itemwise
