# Copyright (c) 2013, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from toolz import groupby


def execute(filters=None):
	columns, data = _get_columns(), _get_data(_get_clauses(), filters)
	return columns, data


def _get_columns():
	def make_column(key, label=None, type="Data", options=None, width=120):
		return {
			"label": _(label or key.replace("_", " ").title()),
			"fieldname": key,
			"fieldtype": type,
			"options": options,
			"width": width
		}

	return [
		make_column("invoice", type="Link", options="Sales Invoice"),
		make_column("posting_date", "Date", type="Date"),
		make_column("posting_time", "Time", type="Time"),
		make_column("cash", type="Float"),
		make_column("card", type="Float"),
		make_column("total", type="Float")
	]


def _get_data(clauses, values):
	result = frappe.db.sql(
		"""
			SELECT
				si.name AS invoice,
				si.posting_date AS posting_date,
				si.posting_time AS posting_time,
				si.change_amount AS change_amount,
				sip.mode_of_payment AS mode_of_payment,
				sip.amount AS amount
			FROM `tabSales Invoice` AS si 
			RIGHT JOIN `tabSales Invoice Payment` AS sip ON
				sip.parent = si.name
			WHERE {clauses}
		""".format(
			clauses=clauses
		),
		values=values,
		as_dict=1
	)

	result = _sum_invoice_payments(
		groupby('invoice', result)
	)

	return result


def _sum_invoice_payments(invoice_payments):
	data = []

	def make_change_total(row):
		cash = row.get('cash') - row.get('change')
		card = row.get('card')

		row['total'] = sum([cash, card])

		for col in ['cash', 'card', 'total']:
			row[col] = round(row.get(col), 3)

		return row

	for key, payments in invoice_payments.iteritems():
		invoice_payment_row = reduce(
			_make_payment_row,
			payments,
			_new_invoice_payment()
		)

		data.append(
			make_change_total(invoice_payment_row)
		)

	return data


def _get_clauses():
	clauses = [
		"si.docstatus = 1",
		"si.posting_date BETWEEN %(from_date)s AND %(to_date)s"
	]
	return " AND ".join(clauses)


def _make_payment_row(_, row):
	mop = row.get('mode_of_payment')
	amount = row.get('amount')

	if mop == 'Cash':
		_['cash'] = _['cash'] + amount
	elif mop == 'Credit Card':
		_['card'] = _['card'] + amount

	if not _.get('invoice'):
		_['invoice'] = row.get('invoice')
	if not _.get('change'):
		_['change'] = row.get('change_amount')
	if not _.get('posting_date'):
		_['posting_date'] = row.get('posting_date')
	if not _.get('posting_time'):
		_['posting_time'] = row.get('posting_time')

	return _


def _new_invoice_payment():
	return {
		'invoice': None,
		'posting_date': None,
		'posting_time': None,
		'change': None,
		'cash': 0.00,
		'card': 0.00,
		'total': 0.00
	}
