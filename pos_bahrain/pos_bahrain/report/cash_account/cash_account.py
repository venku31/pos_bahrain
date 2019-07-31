# Copyright (c) 2013, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe

from frappe import _
from erpnext import get_company_currency, get_default_company

from toolz import merge


def execute(filters=None):
	company = get_default_company()

	columns = _get_columns(company)
	data = _get_data(company)

	return columns, data


def _get_columns(company):
	def make_column(key, label=None, type="Data", options=None, width=120):
		return {
			"label": _(label or key.replace("_", " ").title()),
			"fieldname": key,
			"fieldtype": type,
			"options": options,
			"width": width
		}

	currency = get_company_currency(company)

	columns = [
		make_column("posting_date", "Date", type="Date"),
		make_column("voucher_type", "Document Type"),
		make_column(
			"voucher_no",
			"Document No",
			"Dynamic Link",
			"voucher_type",
			180
		),
	]

	columns.extend([
		make_column("debit", "Cash In ({0})".format(currency), type="Float"),
		make_column("credit", "Cash Out ({0})".format(currency), type="Float"),
		make_column("balance", "Balance ({0})".format(currency), type="Float")
	])

	return columns


def _get_data(company):
	cash_account = frappe.db.get_value('Company', company, 'default_cash_account')
	result = frappe.db.sql(
		"""
			SELECT
				posting_date,
				voucher_type,
				voucher_no,
				debit,
				credit
			FROM `tabGL Entry`
			WHERE 
				voucher_type IN ('Sales Invoice', 'Purchase Invoice', 'Payment Entry', 'Journal Entry')
			AND company=%(company)s AND account=%(account)s
		""",
		values={'company': company, 'account': cash_account},
		as_dict=True
	)

	result = set_balance(result)

	return result


def set_balance(data):
	data_with_balances = []

	balance = 0.00
	for row in data:
		balance = balance + (row.debit - row.credit)
		data_with_balances.append(
			merge(row, {'balance': balance})
		)

	return data_with_balances

