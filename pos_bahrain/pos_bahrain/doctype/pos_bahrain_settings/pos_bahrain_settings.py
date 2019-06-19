# -*- coding: utf-8 -*-
# Copyright (c) 2019, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
from frappe.utils import cint
from frappe.model.document import Document
from frappe.custom.doctype.property_setter.property_setter import make_property_setter


class POSBahrainSettings(Document):
    def on_update(self):
        toggle_fields(not cint(self.use_batch_price))


def toggle_fields(hide):
    make_property_setter("Batch", "pb_price_sec", "hidden", hide, "Check")
    make_property_setter("Batch", "pb_price_sec", "print_hide", hide, "Check")
