# Copyright (c) 2013, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe


def execute(filters=None):
	from erpnext.stock.report.stock_balance.stock_balance import execute
	columns, data = execute(filters)
	return columns, data
