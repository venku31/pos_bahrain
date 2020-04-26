# Copyright (c) 2013, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from erpnext.controllers.taxes_and_totals import get_itemised_tax_breakup_data
from functools import partial
from toolz import compose, concatv, pluck, merge, groupby, concat, excepts, first

from pos_bahrain.utils import pick
from pos_bahrain.utils.report import make_column


def execute(filters=None):
    return make_report("Sales Invoice", filters)


def make_report(doctype, filters):
    if doctype not in ["Sales Invoice", "Purchase Invoice"]:
        frappe.throw(
            frappe._("Report not available for {}".format(frappe.bold(doctype)))
        )
    columns = _get_columns(doctype, filters)
    keys = compose(list, partial(pluck, "fieldname"))(columns)
    clauses, values = _get_filters(doctype, filters)
    data = _get_data(clauses, values, keys)
    return columns, data


def _get_columns(doctype, filters):
    return [
        make_column("vat_return_no", "VAT return field number", width=150),
        make_column("invoice", "Invoice number", width=150),
        make_column("date", "Invoice date", type="Date", width=90),
        make_column("vat_account_no", "VAT Account Number", width=150),
        make_column("party_name", "Client name", width=150),
        make_column("description", "Good/Service description", width=180),
        make_column("taxable_amount", "Total BHD (exclusive of VAT)", type="Float"),
        make_column("vat_amount", "VAT amount", type="Float"),
        make_column("total_amount", "Total BHD (inclusive of VAT)", type="Float"),
    ]


def _get_filters(doctype, filters):
    vat_exempt_account = frappe.db.get_single_value(
        "POS Bahrain Settings", "vat_exempt_account"
    )
    if not vat_exempt_account:
        frappe.throw(
            frappe._(
                "Please set {}: <em>VAT Exempt Account</em>".format(
                    frappe.get_desk_link("POS Bahrain Settings", "")
                )
            )
        )
    clauses = [
        "d.posting_date BETWEEN %(from_date)s AND %(to_date)s",
        "dt.account_head {} %(tax_account)s".format(
            "=" if filters.vat_type == "exempt" else "!="
        ),
    ]
    values = merge(
        pick(["vat_type"], filters),
        {
            "from_date": filters.date_range[0],
            "to_date": filters.date_range[1],
            "tax_account": vat_exempt_account,
        },
    )
    return (
        {
            "doctype": doctype,
            "item_doctype": "{} Item".format(doctype),
            "tax_doctype": "{} Taxes and Charges".format(
                "Sales" if doctype == "Sales Invoice" else "Purchase"
            ),
            "party_name": "{}_name".format(
                "customer" if doctype == "Sales Invoice" else "supplier"
            ),
            "clauses": " AND ".join(clauses),
        },
        values,
    )


def _get_data(clauses, values, keys):
    invoices = frappe.db.sql(
        """
            SELECT
                d.name AS name,
                d.posting_date,
                d.tax_id AS tax_id,
                d.{party_name} AS {party_name}
            FROM `tab{tax_doctype}` AS dt
            LEFT JOIN `tab{doctype}` AS d ON d.name = dt.parent
            WHERE {clauses}
            GROUP BY d.name
        """.format(
            **clauses
        ),
        values=values,
        as_dict=1,
    )
    items = _get_child_table_rows(clauses.get("item_doctype"), invoices)
    taxes = _get_child_table_rows(clauses.get("tax_doctype"), invoices)

    def make_doc(x):
        doc = frappe.get_doc(merge({"doctype": clauses.get("doctype")}, x))
        doc.items = items.get(x.get("name"), [])
        doc.taxes = taxes.get(x.get("name"), [])
        return doc

    def breakup_taxes(doc):
        tax, amount = get_itemised_tax_breakup_data(doc)
        # signatures
        # tax {item_code: {tax_description: {"tax_rate": tax_rate, "tax_amount": tax_amount}}}
        # amount {item_code: taxable_amount}
        def get_amounts(item_code):
            taxable_amount = amount.get(item_code, 0)
            vat_amount = sum(
                [x.get("tax_amount") for x in tax.get(item_code, {}).values()]
            )
            return {
                "taxable_amount": taxable_amount,
                "vat_amount": vat_amount,
                "total_amount": taxable_amount + vat_amount,
            }

        def get_item_name(item_code):
            return compose(
                excepts(StopIteration, first, lambda _: item_code),
                partial(map, lambda x: x.item_name),
                lambda: filter(lambda x: x.item_code == item_code, doc.items),
            )()

        return [
            merge(
                {
                    "invoice": doc.name,
                    "date": doc.posting_date,
                    "vat_account_no": doc.tax_id,
                    "party_name": doc.get(clauses.get("party_name")),
                    "description": get_item_name(x),
                },
                get_amounts(x),
            )
            for x in amount
        ]

    def filter_type(row):
        if values.get("vat_type") == "standard":
            return row.get("vat_amount") != 0
        if values.get("vat_type") == "zero":
            return row.get("vat_amount") == 0
        return True

    make_row = compose(breakup_taxes, make_doc)
    make_list = compose(list, partial(filter, filter_type), concat)
    return make_list([make_row(x) for x in invoices])


def _get_child_table_rows(child_doctype, invoices):
    if not invoices:
        return {}
    return groupby(
        "parent",
        frappe.db.sql(
            """
                SELECT * FROM `tab{child_doctype}` WHERE parent IN %(invoices)s
            """.format(
                child_doctype=child_doctype
            ),
            values={"invoices": [x.get("name") for x in invoices]},
            as_dict=1,
        ),
    )
