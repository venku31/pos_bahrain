from __future__ import unicode_literals
import frappe

def execute(filters=None):
    columns = [
        {"label": "Item", "fieldname": "item_code", "fieldtype": "Link", "options": "Item", "width": 100},
        {"label": "Item Name", "fieldname": "item_name", "width": 150},
        {"label": "Item Group", "fieldname": "item_group", "fieldtype": "Link", "options": "Item Group", "width": 100},
        {"label": "Warehouse", "fieldname": "warehouse", "fieldtype": "Link", "options": "Warehouse", "width": 100},
        {"label": "Stock UOM", "fieldname": "stock_uom", "fieldtype": "Link", "options": "UOM", "width": 90},
        {"label": "Balance Qty", "fieldname": "bal_qty", "fieldtype": "Float", "width": 100, "convertible": "qty"},
        {"label": "Balance Value", "fieldname": "bal_val", "fieldtype": "Currency", "width": 100, "options": "currency"},
        {"label": "Opening Qty", "fieldname": "opening_qty", "fieldtype": "Float", "width": 100, "convertible": "qty"},
        {"label": "Opening Value", "fieldname": "opening_val", "fieldtype": "Currency", "width": 110, "options": "currency"},
        {"label": "In Qty", "fieldname": "in_qty", "fieldtype": "Float", "width": 80, "convertible": "qty"},
        {"label": "In Value", "fieldname": "in_val", "fieldtype": "Float", "width": 80},
        {"label": "Out Qty", "fieldname": "out_qty", "fieldtype": "Float", "width": 80, "convertible": "qty"},
        {"label": "Out Value", "fieldname": "out_val", "fieldtype": "Float", "width": 80},
        {"label": "Valuation Rate", "fieldname": "val_rate", "fieldtype": "Currency", "width": 90, "convertible": "rate", "options": "currency"},
        {"label": "Reorder Level", "fieldname": "reorder_level", "fieldtype": "Float", "width": 80, "convertible": "qty"},
        {"label": "Reorder Qty", "fieldname": "reorder_qty", "fieldtype": "Float", "width": 80, "convertible": "qty"},
        {"label": "Company", "fieldname": "company", "fieldtype": "Link", "options": "Company", "width": 100},
        {"label": "Batch", "fieldname": "batch", "fieldtype": "Data", "width": 100},
        {"label": "Expiry Date", "fieldname": "expiry_date", "fieldtype": "Date", "width": 100},
        {"label": "Expiry in Days", "fieldname": "expiry_in_days", "fieldtype": "Int", "width": 100},
        {"label": "Batch Quantity", "fieldname": "batch_quantity", "fieldtype": "Float", "width": 100},
        {"label": "Batch Warehouse", "fieldname": "batch_warehouse", "fieldtype": "Link", "options": "Warehouse", "width": 100},
        {"label": "Supplier", "fieldname": "supplier", "fieldtype": "Link", "options": "Supplier", "width": 100},
    ]

    data = get_stock_ledger_data(filters)
    return columns, data

def get_stock_ledger_data(filters):
    data = frappe.get_all("Stock Ledger Entry",
        fields=["item_code", "item_name", "warehouse", "stock_uom", "bal_qty", "bal_val",
                "opening_qty", "opening_val", "in_qty", "in_val", "out_qty", "out_val",
                "val_rate", "reorder_level", "reorder_qty", "company", "batch", "expiry_date",
                "expiry_in_days", "batch_quantity", "batch_warehouse", "supplier"],
        filters=filters)

    return data
