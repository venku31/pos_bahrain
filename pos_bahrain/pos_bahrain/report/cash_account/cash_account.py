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
	data = _get_data(company, filters)

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
		make_column("balance", "Balance ({0})".format(currency), type="Float"),
		make_column("remarks", "Remarks", width=180)
	])

	return columns


def _get_data(company, filters):
	cash_account = frappe.db.get_value('Company', company, 'default_cash_account')

	values = {
		'from_date': filters.get('from_date'),
		'to_date': filters.get('to_date'),
		'company': company,
		'account': cash_account
	}

	result = frappe.db.sql(
		"""
			SELECT
				posting_date,
				voucher_type,
				voucher_no,
				debit,
				credit,
				remarks
			FROM `tabGL Entry` {clause}
			AND company = %(company)s AND account = %(account)s
			AND posting_date >= %(from_date)s AND posting_date <= %(to_date)s
			ORDER BY posting_date ASC
		""".format(clause=_get_clause()),
		values=values,
		as_dict=True
	)

	opening = _get_opening(company, filters)
	result = _set_balance(opening + result)
	closing = _get_closing(result)

	return result + closing


def _set_balance(data):
	data_with_balances = []

	balance = 0.00
	for row in data:
		row_balance = row.get('debit') - row.get('credit')
		balance = balance + row_balance
		data_with_balances.append(
			merge(row, {'balance': balance})
		)

	return data_with_balances


def _get_opening(company, filters):
	cash_account = frappe.db.get_value('Company', company, 'default_cash_account')

	values = {
		'from_date': filters.get('from_date'),
		'company': company,
		'account': cash_account
	}

	result = frappe.db.sql(
		"""
			SELECT 
				COALESCE(SUM(debit), 0) AS debit,
				COALESCE(SUM(credit), 0) AS credit
			FROM `tabGL Entry` {clause}
			AND company = %(company)s AND account = %(account)s
			AND posting_date < %(from_date)s
		""".format(clause=_get_clause()),
		values=values,
		as_dict=True
	)

	result[0]['voucher_no'] = "'Opening'"

	return result


def _get_closing(data):
	closing = {
		'voucher_no': "'Closing'",
		'debit': 0.00,
		'credit': 0.00,
		'balance': 0.00
	}

	def calculate(_, row):
		_['debit'] = _['debit'] + row.get('debit')
		_['credit'] = _['credit'] + row.get('credit')
		_['balance'] = row.get('balance')# total balance is last row's balance
		return _

	return [
		reduce(calculate, data, closing)
	]


def _get_clause():
	voucher_type_clause = """
		WHERE voucher_type 
		IN ('Sales Invoice', 'Purchase Invoice', 'Payment Entry', 'Journal Entry')
	"""

	return voucher_type_clause
