// Copyright (c) 2016, 	9t9it and contributors
// For license information, please see license.txt
/* eslint-disable */


frappe.query_reports["Purchase Plan Scheduling Report"] = {
	"filters": [
		{
			"fieldname": "start_date",
			"label": __("Start Date"),
			"fieldtype": "Date",
			"reqd": 1,
					},
					{
			"fieldname": "end_date",
			"label": __("End Date"),
			"fieldtype": "Date",
			"reqd": 1,
					},
							{
			"fieldname": "item",
			"label": __("Item"),
			"fieldtype": "Link",
			"options":"Item",
					},
							{
			"fieldname": "item_group",
			"label": __("Item Group"),
			"fieldtype": "Link",
			"options":"Item Group",
			"reqd": 1,
					},
							{
			"fieldname": "months_to_arrive",
			"label": __("Months to Arrive"),
			"fieldtype": "Int",
			"reqd": 1,
					},
							{
			"fieldname": "percentage",
			"label": __("Percentage"),
			"fieldtype": "Int",
			"reqd": 1,
					},
							{
			"fieldname": "minimum_months",
			"label": __("Minimum Months"),
			"fieldtype": "Int",
			"reqd": 1,
					}
	
		
	
	]
};
