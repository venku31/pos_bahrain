# Copyright (c) 2013, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _, scrub
import json
import numpy
from datetime import date


def execute(filters=None):
	filters = frappe._dict(filters or {})
	# if not filters: filters = frappe._dict()

	columns = [
		{
			'fieldname': 'invoice_date',
			'label': _('Tax Invoice Date'),
			'fieldtype': 'Data',
			"width": 160
		},
		{
			'fieldname': 'sales_man',
			'label': _('Sales Man'),
			'fieldtype': 'Data',
			"width": 100
		},
		{
			'fieldname': 'customer',
			'label': _('Customer Name'),
			'fieldtype': 'Data',
			"width": 100
		},
		{
			'fieldname': 'invoice_no',
			'label': _('Description'),
			'fieldtype': 'Link',
			"options": "Sales Invoice",
			"width": 160
		},
		{
			'fieldname': 'amount_before_discount',
			'label': _('Amount Before Discount'),
			'fieldtype': 'Data',
			"width": 100
		},
		{
			'fieldname': 'discount',
			'label': _('Discount'),
			'fieldtype': 'Data',
			"width": 100
		},
		{
			'fieldname': 'amount_after_discount',
			'label': _("Amount After Discount"),
			'fieldtype': 'Data',
			"width": 160
		},
		{
			'fieldname': 'vat',
			'label': _('VAT'),
			'fieldtype': 'Data',
			"width": 100
		},
		{
			'fieldname': 'total_sales',
			'label': _('Total Sales'),
			'fieldtype': 'Data',
			"width": 100
		},
		{
			'fieldname': 'payment',
			'label': _('Payment'),
			'fieldtype': 'Data',
			"width": 100
		},
		{
			'fieldname': 'outstanding',
			'label': _('Outstanding'),
			'fieldtype': 'Data',
			"width": 100
		},
		{
			'fieldname': 'mop',
			'label': _('Payment Method'),
			'fieldtype': 'Data',
			"width": 100
		},
		{
			'fieldname': 'disc_percent',
			'label': _('Discount %'),
			'fieldtype': 'Data',
			"width": 100
		}
	]

	data = get_data(filters['from_date'], filters['to_date'])
	return columns, data


def get_data(from_date, to_date):

	inv_data = frappe.db.sql(""" SELECT
								si.posting_date AS invoice_date,
								si.pb_sales_employee_name AS sales_man,
								si.customer_name AS customer,
								si.name AS invoice_no,
								SUM(inv_item.price_list_rate) AS amount_before_discount,
								SUM(inv_item.discount_amount) AS discount,
								SUM(inv_item.amount) AS amount_after_discount,
								si.total_taxes_and_charges AS vat,
								si.grand_total AS total_sales,
								(si.grand_total - si.outstanding_amount) AS payment,
								si.outstanding_amount AS outstanding, 
								ip.mode_of_payment as mop,
								si.pb_discount_percentage as disc_percent,
								si.docstatus as docstatus,
								si.is_return
								
							FROM
								`tabSales Invoice` si
							LEFT JOIN
								`tabSales Invoice Item` inv_item ON inv_item.parent = si.name
							LEFT JOIN
								`tabSales Invoice Payment` ip ON ip.parent = si.name
							GROUP BY
								si.name
							HAVING
								si.docstatus = 1 AND si.is_return = 0 AND 
								si.posting_date BETWEEN '%(from_date)s' AND '%(to_date)s'
								"""%{"from_date":from_date, "to_date":to_date}, as_dict=1)
	return inv_data
