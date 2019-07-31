# Copyright (c) 2013, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe

from frappe import _


def execute(filters=None):
	columns = _get_columns(filters)
	data = _get_data()
	return columns, data


def _get_columns(filters):
	def make_column(key, label=None, type="Data", options=None, width=120):
		return {
			"label": _(label or key.replace("_", " ").title()),
			"fieldname": key,
			"fieldtype": type,
			"options": options,
			"width": width
		}

	return [
		make_column("posting_date", "Date", type="Date"),
		make_column("voucher_type", "Document Type"),
		make_column("voucher_no", "Document No"),
		make_column("debit", "Cash In", type="currency"),
		make_column("credit", "Cash Out", type="currency"),
		make_column("balance", "Cash In - Cash Out", type="currency")
	]


def _get_data():
	result = frappe.db.sql(
		"""
			SELECT
				posting_date,
				voucher_type,
				voucher_no,
				debit,
				credit
			FROM `tabGL Entry`
			WHERE voucher_type IN ('Sales Invoice', 'Purchase Invoice', 'Payment Entry', 'Journal Entry')
		""",
		as_dict=True
	)

	return result
