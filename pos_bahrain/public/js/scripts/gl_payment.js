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

async function set_calculated_fields(frm, cdt, cdn) {
  const { net_amount = 0, tax_amount = 0 } = frappe.get_doc(cdt, cdn);
  await frappe.model.set_value(
    cdt,
    cdn,
    'total_amount',
    net_amount + tax_amount
  );
  await Promise.all(
    ['net_amount', 'tax_amount', 'total_amount'].map((field) =>
      frm.set_value(
        field,
        frm.doc.items.reduce((a, x) => a + (x[field] || 0), 0)
      )
    )
  );
  frm.refresh();
}

const gl_payment_item = {
  items_add: function (frm, cdt, cdn) {
    frm.script_manager.copy_from_first_row('items', frappe.get_doc(cdt, cdn), [
      'template_type',
      'tax_template',
    ]);
  },
  template_type: function (frm, cdt, cdn) {
    frappe.model.set_value(cdt, cdn, 'tax_template', null);
  },
  net_amount: set_calculated_fields,
  tax_amount: set_calculated_fields,
};

export default function () {
  return {
    gl_payment_item,
    setup: setup_queries,
    payment_type: function (frm) {
      function set_template_type_to(template_type) {
        return ({ doctype: cdt, name: cdn }) => {
          frappe.model.set_value(cdt, cdn, 'template_type', template_type);
        };
      }
      const { payment_type } = frm.doc;
      if (payment_type === 'Incoming') {
        frm.doc.items.forEach(
          set_template_type_to('Sales Taxes and Charges Template')
        );
      } else if (payment_type === 'Outgoing') {
        frm.doc.items.forEach(
          set_template_type_to('Purchase Taxes and Charges Template')
        );
      } else {
        frm.doc.items.forEach(set_template_type_to(null));
      }
    },
    party: async function (frm) {
      const { party_type, party } = frm.doc;
      if (party_type && party) {
        const party_name_field = `${party_type.toLowerCase()}_name`;
        const { message: doc = {} } = await frappe.db.get_value(
          party_type,
          party,
          party_name_field
        );
        frm.set_value('party_name', doc[party_name_field]);
      } else {
        frm.set_value('party_name', null);
      }
    },
  };
}
