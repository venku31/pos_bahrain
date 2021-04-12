import frappe
from frappe.model.mapper import get_mapped_doc

# Customer = Cost Center & Set Cost Center
# Set Cost Center = Supplier
# Date = Date & Supplier Invoice Date

@frappe.whitelist()
def make_purchase_invoice(source_name, target_doc=None):
    def set_missing_values(source, target):
        target.run_method("set_missing_values")
        target.run_method("calculate_taxes_and_totals")

    doc = get_mapped_doc("Sales Invoice", source_name, {
        "Sales Invoice": {
            "doctype": "Purchase Invoice",
            "validation": {
                "docstatus": ["=", 1],
            },
        },
        "Sales Invoice Item": {
            "doctype": "Purchase Invoice Item",
        },
        "Payment Schedule": {
            "doctype": "Payment Schedule",
        },
    }, target_doc, set_missing_values)

    return doc
