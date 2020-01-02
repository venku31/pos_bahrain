# -*- coding: utf-8 -*-
# Copyright (c) 2020, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe


def on_update(doc, method):
    settings = frappe.get_single("POS Bahrain Settings")
    if settings.valuation_price_list and settings.valuation_warehouse == doc.warehouse:
        item_price = frappe.db.exists(
            "Item Price",
            {"item_code": doc.item_code, "price_list": settings.valuation_price_list},
        )
        if item_price:
            if (
                frappe.db.get_value("Item Price", item_price, "price_list_rate")
                != doc.valuation_rate
            ):
                frappe.db.set_value(
                    "Item Price", item_price, "price_list_rate", doc.valuation_rate
                )
        else:
            frappe.get_doc(
                {
                    "doctype": "Item Price",
                    "item_code": doc.item_code,
                    "price_list": settings.valuation_price_list,
                    "price_list_rate": doc.valuation_rate,
                }
            ).insert(ignore_permissions=True)
