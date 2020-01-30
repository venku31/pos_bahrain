# -*- coding: utf-8 -*-
# Copyright (c) 2019, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document


class BarcodePrint(Document):
    def validate(self):
        mismatched_batches = []
        for item in self.items:
            if item.batch and item.item_code != frappe.db.get_value(
                "Batch", item.batch, "item"
            ):
                mismatched_batches.append(item)
        if mismatched_batches:
            frappe.throw(
                "Batches mismatched in rows: {}".format(
                    ", ".join(
                        [
                            "<strong>{}</strong>".format(x.idx)
                            for x in mismatched_batches
                        ]
                    )
                )
            )
