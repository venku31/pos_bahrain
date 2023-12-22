import frappe
from frappe import _
from frappe.custom.doctype.custom_field.custom_field import create_custom_field
from frappe.custom.doctype.property_setter.property_setter import make_property_setter


@frappe.whitelist()
def after_install():
    custom_field_pos()


def custom_field_pos():
    create_custom_field(
        "POS Profile",
        {
            "label": _("POS Abbreviation"),
            "fieldname": "pos_abbreviation",
            "fieldtype": "Data",
            "insert_after": "country",
            "reqd":1,
            "unique":1,
        },
    )