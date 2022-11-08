
from __future__ import unicode_literals
import frappe
import json
from frappe.utils import (
    add_days,
    ceil,
    cint,
    comma_and,
    flt,
    get_link_to_form,
    getdate,
    now_datetime,
    nowdate,today,formatdate, get_first_day, get_last_day 
)
from datetime import date,timedelta

@frappe.whitelist()
def search_prec_item(item):
    item_data = search_serial_or_batch_or_barcode_number(item)
    if item_data != 0:
        #stock = frappe.db.sql("""SELECT item_code,item_name,description,stock_uom,stock_uom as uom,1 as conversion_factor,last_purchase_rate From `tabItem` Where item_code = '%(item_code)s' """%{"item_code": item_data['item_code']}, as_dict = 1)
        stock = frappe.db.sql("""SELECT item.item_code,item.item_name,item.description,item.stock_uom,
IFNULL(uom.uom,item.stock_uom) as uom,IFNULL(uom.conversion_factor,1) as conversion_factor,item.last_purchase_rate From `tabItem` item left join `tabUOM Conversion Detail` uom
ON item.name=uom.parent and uom.conversion_factor>1 Where item.item_code = '%(item_code)s' """%{"item_code": item_data['item_code']}, as_dict = 1)

        return stock
    
    return "Item/Price not found"
def search_serial_or_batch_or_barcode_number(search_value):
    # search barcode no
    barcode_data = frappe.db.get_value('Item Barcode', {'barcode': search_value}, ['barcode', 'parent as item_code', 'pb_uom'], as_dict=True)
    if barcode_data:
        barcode_data["type"] = "item_barcode"
        return barcode_data

    #confirm item code
    item_code_data = frappe.db.get_value('Item', search_value, ['name as item_code'], as_dict=True)
    if item_code_data:
        item_code_data["type"] = "item_code"
        item_code_data["pb_uom"] = ""
        return item_code_data
    
    # search batch no
    batch_no_data = frappe.db.get_value('Batch', search_value, ['name as batch_no', 'item as item_code'], as_dict=True)
    if batch_no_data:
        batch_no_data["type"] = "batch"
        return batch_no_data

    # search serial no
    serial_no_data = frappe.db.get_value('Serial No', search_value, ['name as serial_no', 'item_code'], as_dict=True)
    if serial_no_data:
        serial_no_data["type"] = "item_serial"
        return serial_no_data

    return 0  

@frappe.whitelist()
def create_purchase_receipt(data=None):
    status = frappe.db.get_single_value("Price Checker API Settings", "purchase_receipt_status")
    data=json.loads(frappe.request.data)
    if status == "Draft" :
        try:
            prec_doc = frappe.new_doc("Purchase Receipt")
            prec_doc.supplier = data.get("supplier")
            prec_doc.posting_date = today()
            prec_doc.supplier_delivery_note = data.get("supplier_invoice_no")
            prec_doc.supplier_invoice_date = data.get("supplier_invoice_date")
            items=[]
            for item in data["items"]:
                prec_doc.append("items",
                {
                    "item_code": item["item_code"],
                    "item_name": frappe.db.get_value("Item", item["item_code"],"item_name"),
                    "description" : frappe.db.get_value("Item", item["item_code"],"description"),
                    "qty":item["qty"],
                    "rate": item["rate"],
                    "uom": item["uom"],
                    "conversion_factor": item["conversion_factor"],
                    "warehouse": item["warehouse"],
                    "pb_expiry_date" : item["expiry_date"],
                })
            prec_doc.set_missing_values()
            prec_doc.insert(ignore_permissions=True)
            # prec_doc.submit()
            if prec_doc :
                return prec_doc.name
        except Exception as e:
            return {"error":e}
    else :
        try:
            prec_doc = frappe.new_doc("Purchase Receipt")
            prec_doc.supplier = data.get("supplier")
            prec_doc.posting_date = today()
            prec_doc.supplier_delivery_note = data.get("supplier_invoice_no")
            prec_doc.supplier_invoice_date = data.get("supplier_invoice_date")
            items=[]
            for item in data["items"]:
                prec_doc.append("items",
                {
                    "item_code": item["item_code"],
                    "item_name": frappe.db.get_value("Item", item["item_code"],"item_name"),
                    "description" : frappe.db.get_value("Item", item["item_code"],"description"),
                    "qty":item["qty"],
                    "rate": item["rate"],
                    "uom": item["uom"],
                    "conversion_factor": item["conversion_factor"],
                    "warehouse": item["warehouse"],
                    "pb_expiry_date" : item["expiry_date"],
                })
            prec_doc.set_missing_values()
            prec_doc.insert(ignore_permissions=True)
            prec_doc.submit()
            frappe.db.commit()
            if prec_doc :
                return prec_doc.name
        except Exception as e:
            return {"error":e}
        
@frappe.whitelist()
def create_prec(supplier,item_code,warehouse,qty,stock_uom,uom,conversion_factor,rate,supplier_invoice_no,supplier_invoice_date):
    status = frappe.db.get_single_value("Price Checker API Settings", "purchase_receipt_status")
    if status == "Draft" :
        try:
            prec_doc = frappe.new_doc("Purchase Receipt")
            prec_doc.supplier = supplier
            prec_doc.posting_date = today()
            prec_doc.supplier_delivery_note = supplier_invoice_no
            prec_doc.supplier_invoice_date = supplier_invoice_date
            prec_doc.append("items",
                {
                    "item_code": item_code,
                    "item_name": frappe.db.get_value("Item",item_code,"item_name"),
                    "description" : frappe.db.get_value("Item",item_code,"description"),
                    "qty":qty,
                    "rate": rate,
                    "stock_uom": stock_uom,
                    "uom": uom,
                    "conversion_factor": conversion_factor,
                    "warehouse": warehouse
                })
            prec_doc.insert(ignore_permissions=True)
            # prec_doc.submit()
            if prec_doc :
                return prec_doc.name
        except Exception as e:
            return {"error":e}
    else :
        try:
            prec_doc = frappe.new_doc("Purchase Receipt")
            prec_doc.supplier = supplier
            prec_doc.posting_date = today()
            prec_doc.supplier_delivery_note = supplier_invoice_no
            prec_doc.supplier_invoice_date = supplier_invoice_date
            prec_doc.append("items",
                {
                    "item_code": item_code,
                    "item_name": frappe.db.get_value("Item",item_code,"item_name"),
                    "description" : frappe.db.get_value("Item",item_code,"description"),
                    "qty":qty,
                    "rate": rate,
                    "stock_uom": stock_uom,
                    "uom": uom,
                    "conversion_factor": conversion_factor,
                    "warehouse": warehouse
                })
            prec_doc.insert(ignore_permissions=True)
            prec_doc.submit()
            frappe.db.commit()
            if prec_doc :
                return prec_doc.name
        except Exception as e:
            return {"error":e}



