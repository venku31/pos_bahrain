import '../../../../../erpnext/erpnext/accounts/report/accounts_payable/accounts_payable';

export default function () {
  const base_settings = frappe.query_reports['Accounts Payable'];
  const { filters } = base_settings;
  return Object.assign({}, base_settings, {
    filters: [
      ...filters.slice(0, 8),
      {
        fieldname: 'cost_center',
        label: __('Cost Center'),
        fieldtype: 'Link',
        options: 'Cost Center',
      },
      ...filters.slice(8),
    ],
  });
}
