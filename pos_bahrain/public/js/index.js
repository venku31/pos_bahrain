import * as scripts from './scripts';

frappe.provide('pos_bahrain');

frappe.ui.form.on(
  'Sales Invoice Item',
  scripts.sales_invoice.sales_invoice_item
);

pos_bahrain = { scripts };
