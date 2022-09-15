from __future__ import unicode_literals
import frappe
import json

@frappe.whitelist()
def get_warehouse_list():
    warehouse_list = frappe.db.sql("""SELECT name as warehouse_code,warehouse_name From `tabWarehouse` """, as_dict = 1)
    return warehouse_list