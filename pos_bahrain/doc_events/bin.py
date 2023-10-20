# -*- coding: utf-8 -*-
# Copyright (c) 2020, 	9t9it and contributors
# For license information, please see license.txt

# from __future__ import unicode_literals
import frappe


# from pos_bahrain.api.self import set_item_price_from_self


def on_update(doc,method):
    self = doc
    settings = frappe.get_single("POS Bahrain Settings")
    
    if settings.valuation_price_list:
        for warehouse in settings.multi_warehouse:
            if warehouse.warehouse == self.warehouse:
                item_price = frappe.db.exists(
                    "Item Price",
                    {"item_code": self.item_code, "price_list": warehouse.price_list},
                )
                valuation_rate = self.valuation_rate or 0

                if item_price:
                    if frappe.db.get_value("Item Price", item_price, "price_list_rate") != valuation_rate:
                        frappe.db.set_value(
                            "Item Price", item_price, "price_list_rate", valuation_rate
                        )
                else:
                    frappe.get_doc(
                        {
                            "doctype": "Item Price",
                            "item_code": self.item_code,
                            "price_list": warehouse.price_list,
                            "price_list_rate": valuation_rate,
                            # "warehouse": warehouse.warehouse,
                            "uom":self.stock_uom,
                        }
                    ).insert(ignore_permissions=True)
            

