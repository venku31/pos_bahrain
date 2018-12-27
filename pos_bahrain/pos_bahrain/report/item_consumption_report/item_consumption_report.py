# Copyright (c) 2013, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.utils import today, getdate
from functools import partial, reduce
import operator
from toolz import merge, pluck, get, compose, first, flip

from pos_bahrain.pos_bahrain.report.item_consumption_report.helpers \
	import generate_intervals


def execute(filters=None):
	args = _get_args(filters)
	columns = _get_columns(args)
	data = _get_data(args, columns)
	return compose(
		list, partial(pluck, 'label')
	)(columns), data


def _get_args(filters={}):
	return merge(filters, {
		'price_list': frappe.db.get_value(
			'Buying Settings', None, 'buying_price_list'
		),
		'start_date': filters.get('start_date') or today(),
		'end_date': filters.get('end_date') or today(),
	})


def _get_columns(args):
	columns = [
		{'key': 'item_code', 'label': _('Item Code') + ':Link/Item:120'},
		{'key': 'brand', 'label': _('Brand') + ':Link/Brand:120'},
		{'key': 'item_name', 'label': _('Item Name') + '::200'},
		{
			'key': 'price',
			'label': args.get('price_list', 'Standard Buying Price') + ':Currency:120',
		},
		{'key': 'stock', 'label': _('Available Stock') + ':Float:90'},
	]
	intervals = compose(
		partial(
			map,
			lambda x: merge(x, {'label': x.get('label') + ':Float:90'})
		),
		generate_intervals,
	)
	return columns + intervals(
		args.get('interval'), args.get('start_date'), args.get('end_date')
	) + [{
		'key': 'total_consumption',
		'label': _('Total Consumption') + ':Float:90',
	}]


def _get_data(args, columns):
	items = frappe.get_all(
		'Item',
		fields=['item_code', 'brand', 'item_name'],
		filters={'disabled': 0},
	)
	prices = frappe.get_all(
		'Item Price',
		fields=['item_code', 'price_list_rate'],
		filters=[
			['price_list', '=', args.get('price_list')],
			['item_code', 'in', list(pluck('item_code', items))]
		],
	)
	warehouses = frappe.get_all(
		'Warehouse',
		filters={'company': args.get('company')},
	)
	bins = frappe.get_all(
		'Bin',
		fields=['item_code', 'actual_qty'],
		filters=[
			['warehouse', 'in', list(pluck('name', warehouses))],
		],
	)
	sles = frappe.get_all(
		'Stock Ledger Entry',
		fields=['item_code', 'posting_date', 'actual_qty'],
		filters=[
			['docstatus', '<', 2],
			['voucher_type', '=', 'Sales Invoice'],
			['company', '=', args.get('company')],
			['posting_date', '>=', args.get('start_date')],
			['posting_date', '<=', args.get('end_date')],
		]
	)
	keys = compose(list, partial(pluck, 'key'))(columns)
	periods = compose(
		list,
		partial(filter, lambda x: x.get('start_date') and x.get('end_date')),
	)(columns)

	set_price = _set_price(prices)
	set_stock = _set_stock(bins)
	set_consumption = _set_consumption(sles, periods)

	def make_row(item):
		return compose(
			partial(get, keys),
			set_consumption,
			set_stock,
			set_price,
		)(item)

	return map(make_row, items)


def _set_price(prices):
	part_fn = compose(
		partial(get, 'price_list_rate', default=0),
		first,
		partial(flip, filter, prices),
	)

	def fn(item):
		try:
			price = part_fn(lambda x: x.item_code == item.get('item_code'))
		except StopIteration:
			price = 0
		return merge(item, {'price': price})
	return fn


def _set_stock(bins):
	part_fn = compose(
		sum,
		partial(pluck, 'actual_qty'),
		partial(flip, filter, bins),
	)

	def fn(item):
		return merge(item, {
			'stock': part_fn(
				lambda x: x.item_code == item.get('item_code')
			)
		})
	return fn


def _set_consumption(sles, periods):
	summer = compose(
		operator.neg,
		sum,
		partial(pluck, 'actual_qty'),
	)

	def seg_date_filter(p):
		start_date = p.get('start_date')
		end_date = p.get('end_date')

		def fn(x):
			return start_date <= getdate(x.get('posting_date')) <= end_date \
				if start_date and end_date else None
		return fn

	segregator_fns = map(
		lambda x: merge(x, {
			'fn': compose(
				summer,
				partial(filter, seg_date_filter(x)),
				partial(flip, filter, sles),
			),
		}),
		periods
	)

	def segregator(item_code):
		return reduce(
			lambda a, p: merge(a, {
				p.get('key'): p.get('fn')(lambda x: x.item_code == item_code),
			}),
			segregator_fns,
			{}
		)

	total_fn = compose(
		summer, partial(flip, filter, sles),
	)

	def total(item_code):
		return {
			'total_consumption': total_fn(lambda x: x.item_code == item_code),
		}

	def fn(item):
		return merge(
			item,
			segregator(item.get('item_code')),
			total(item.get('item_code')),
		)
	return fn
