function setup_queries(frm) {
  frm.set_query('cost_center', function ({ company }) {
    return { filters: { company, is_group: 0 } };
  });
  frm.set_query('party_type', function () {
    return {
      filters: {
        name: ['in', Object.keys(frappe.boot.party_account_types)],
      },
    };
  });
  frm.set_query('account', 'items', function ({ company }) {
    return { filters: { company, root_type: ['in', ['Income', 'Expense']] } };
  });
  frm.set_query('template_type', 'items', function () {
    return {
      filters: {
        name: [
          'in',
          [
            'Sales Taxes and Charges Template',
            'Purchase Taxes and Charges Template',
          ],
        ],
      },
    };
  });
}

export default function () {
  return {
    setup: setup_queries,
  };
}
