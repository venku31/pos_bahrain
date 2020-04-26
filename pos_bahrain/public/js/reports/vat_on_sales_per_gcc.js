export default function () {
  return {
    filters: [
      {
        fieldtype: 'DateRange',
        fieldname: 'date_range',
        label: 'Date Range',
        reqd: 1,
        default: [frappe.datetime.month_start(), frappe.datetime.month_end()],
      },
      {
        fieldtype: 'Select',
        fieldname: 'vat_type',
        label: 'VAT Type',
        reqd: 1,
        options: [
          { label: 'Standard Rated', value: 'standard' },
          { label: 'Zero Rated', value: 'zero' },
          { label: 'Exempted', value: 'exempt' },
        ],
        default: 'standard',
      },
    ],
  };
}
