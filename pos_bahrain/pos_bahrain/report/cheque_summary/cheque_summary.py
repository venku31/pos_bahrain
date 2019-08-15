# Copyright (c) 2013, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from functools import partial
from toolz import compose, pluck, merge

from pos_bahrain.utils import pick


def execute(filters=None):
    columns = _get_columns(filters)
    keys = compose(list, partial(pluck, "fieldname"))(columns)
    clauses, values = _get_filters(filters)
    data = _get_data(clauses, values, keys)
    return columns, data


def _get_columns(filters):
    def make_column(key, label=None, type="Data", options=None, width=120):
        return {
            "label": _(label or key.replace("_", " ").title()),
            "fieldname": key,
            "fieldtype": type,
            "options": options,
            "width": width,
        }

    return [
        make_column("doctype", "Document Type", type="Link", options="Doctype"),
        make_column("docname", "Document No", type="Dynamic Link", options="doctype"),
        make_column("posting_date", "Date", type="Date", width=90),
        make_column("party", type="Link", options="Customer"),
        make_column("party_name", width=150),
        make_column("cheque_no"),
        make_column("cheque_date", type="Date", width=90),
        make_column("amount", type="Currency", width=90),
    ]


def _get_filters(filters):
    pe_clauses = [
        "pe.docstatus = 1",
        "pe.posting_date BETWEEN %(from_date)s AND %(to_date)s",
        "pe.payment_type = 'Receive'",
        "pe.mode_of_payment = 'Cheque'",
    ]
    je_clauses = [
        "je.docstatus = 1",
        "je.posting_date BETWEEN %(from_date)s AND %(to_date)s",
        "je.voucher_type = 'Bank Entry'",
        "je.pb_is_cheque = 1",
    ]
    values = merge(
        pick(["customer", "branch"], filters),
        {"from_date": filters.date_range[0], "to_date": filters.date_range[1]},
    )
    return (
        {
            "pe_clauses": " AND ".join(pe_clauses),
            "je_clauses": " AND ".join(je_clauses),
        },
        values,
    )


def _get_data(clauses, values, keys):
    result = frappe.db.sql(
        """
            SELECT
                'Payment Entry' AS doctype,
                pe.name AS docname,
                pe.posting_date AS posting_date,
                pe.party AS party,
                pe.party_name AS party_name,
                pe.reference_no AS cheque_no,
                pe.reference_date AS cheque_date,
                pe.paid_amount AS amount
            FROM `tabPayment Entry` AS pe
            WHERE {pe_clauses}
            UNION ALL
            SELECT
                'Journal Entry' AS doctype,
                je.name AS name,
                je.posting_date AS posting_date,
                jea.party AS party,
                c.customer_name AS party_name,
                je.cheque_no AS cheque_no,
                je.cheque_date AS cheque_date,
                je.total_debit AS amount
            FROM `tabJournal Entry` AS je
            LEFT JOIN `tabJournal Entry Account` AS jea ON
                jea.parent = je.name AND
                jea.party_type = 'Customer'
            LEFT JOIN `tabCustomer` AS c ON
                c.name = jea.party
            WHERE {je_clauses}
            ORDER BY posting_date
        """.format(
            **clauses
        ),
        values=values,
        as_dict=1,
    )

    make_row = partial(pick, keys)
    return map(make_row, result)
