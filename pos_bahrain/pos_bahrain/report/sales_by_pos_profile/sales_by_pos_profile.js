// Copyright (c) 2016, 	9t9it and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports['Sales by POS Profile'] = {
  filters: [
    {
      fieldname: 'from_date',
      label: __('From Date'),
      fieldtype: 'Date',
      reqd: 1,
      default: frappe.datetime.get_today(),
    },
    {
      fieldname: 'to_date',
      label: __('To Date'),
      fieldtype: 'Date',
      reqd: 1,
      default: frappe.datetime.get_today(),
    },
    {
      fieldname: 'pos_profile',
      label: __('POS Profile'),
      fieldtype: 'Link',
      options: 'POS Profile',
    },
    {
      fieldname: 'summary_view',
      label: __('Summary View'),
      fieldtype: 'Check',
    },
  ],
};
