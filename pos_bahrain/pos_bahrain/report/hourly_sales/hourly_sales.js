// Copyright (c) 2016, 	9t9it and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Hourly Sales"] = {
	"filters": [
      {
        fieldname: 'posting_date',
        label: __('Posting Date'),
        fieldtype: 'Date',
        width: '80',
        reqd: 1,
        default: frappe.datetime.get_today(),
      },
	]
}
