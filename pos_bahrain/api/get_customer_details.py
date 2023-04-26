import frappe

@frappe.whitelist()
def get_customer_address(customer_name):
    address_row_exists = frappe.db.exists("Dynamic Link", {
        "link_doctype": "Customer",
        "link_name": customer_name,
        "parenttype": "Address"
    })
    #SELECT * FROM `tabDynamic Link` WHERE link_doctype="Customer" AND link_name="C000001" AND parenttype="Address";

    if address_row_exists:
        address_row_doc = frappe.get_value("Dynamic Link", address_row_exists, "parent")
        address_line1 = frappe.get_value("Address", address_row_doc, "address_line1") or " "
        address_line2 = frappe.get_value("Address", address_row_doc, "address_line2") or " "
        return {"address_line1": address_line1, "address_line2": address_line2}

    return {"address_line1": "", "address_line2": ""}

@frappe.whitelist()
def get_customer_contact(customer_name):
    contact_row_exists = frappe.db.exists("Dynamic Link", {
        "link_doctype": "Customer",
        "link_name": customer_name,
        "parenttype": "Contact"
    })
    #SELECT * FROM `tabDynamic Link` WHERE link_doctype="Customer" AND link_name="C000061" AND parenttype="Contact";

    if contact_row_exists:
        #contact_exists = frappe.db.exists("Contact", {"is_primary_contact": 1})
        contact_doc = frappe.get_value("Dynamic Link", contact_row_exists, "parent")
        contact = frappe.get_value("Contact", contact_doc, "phone") or ""
        return {"contact": contact}
    
    return {"contact": ""}

@frappe.whitelist()
def get_customer_full_name(customer_name):
    customer_full_name = frappe.get_value("Customer", customer_name, "customer_name")
    return {"customer_name": customer_full_name}

@frappe.whitelist()
def get_default_customer_name():
    default_customer = frappe.get_value("POS Profile", "Arad", "customer")
    if default_customer:
        return get_customer_full_name(default_customer)
    
    return {"customer_name": ""}
