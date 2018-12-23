// Copyright (c) 2018, 	9t9it and contributors
// For license information, please see license.txt

frappe.ui.form.on('POS Voucher', {
  onload: async function(frm) {
    const { period_to = frappe.datetime.now_datetime(), fetch_data } =
      frappe.route_options || {};
    if (fetch_data) {
      await frm.set_value('period_to', period_to);
      frm.trigger('fetch_and_set_data');
    } else if (frm.doc.docstatus === 0 && !frm.doc.period_to) {
      frm.set_value('period_to', period_to);
    }
  },
  fetch_and_set_data: async function(frm) {
    frm.set_value('closing_amount', 0);
    const { period_from, period_to, company, pos_profile, user } = frm.doc;
    const {
      message: { invoices = [], payments = [], taxes = [] } = {},
    } = await frappe.call({
      method: 'pos_bahrain.api.pos_voucher.get_data',
      args: { period_from, period_to, company, pos_profile, user },
      freeze: true,
      freeze_message: 'Loading data',
    });
    frm.set_value(
      'grand_total',
      invoices.reduce((a, { grand_total = 0 }) => a + grand_total, 0)
    );
    frm.set_value(
      'net_total',
      invoices.reduce((a, { net_total = 0 }) => a + net_total, 0)
    );
    frm.set_value(
      'total_quantity',
      invoices.reduce((a, { pos_total_qty = 0 }) => a + pos_total_qty, 0)
    );
    frm.set_value(
      'tax_total',
      taxes.reduce((a, { tax_amount = 0 }) => a + tax_amount, 0)
    );
    frm.clear_table('payments');
    payments.forEach(({ base_amount: expected_amount, ...rest }) => {
      frm.add_child(
        'payments',
        Object.assign({}, rest, {
          expected_amount,
          difference_amount: -expected_amount,
        })
      );
    });
    frm.refresh_field('payments');
    frm.clear_table('invoices');
    invoices.forEach(
      ({ name: invoice, pos_total_qty: total_quantity, grand_total }) => {
        frm.add_child('invoices', { invoice, total_quantity, grand_total });
      }
    );
    frm.refresh_field('invoices');
    frm.clear_table('taxes');
    taxes.forEach(tax => {
      frm.add_child('taxes', tax);
    });
    frm.refresh_field('taxes');
  },
  total_collected: function(frm) {
    const { opening_amount = 0, total_collected = 0 } = frm.doc;
    frm.set_value('closing_amount', opening_amount + total_collected);
  },
});

frappe.ui.form.on('POS Voucher Payment', {
  collected_amount: function(frm, cdt, cdn) {
    const { collected_amount, expected_amount } = frappe.get_doc(cdt, cdn);
    frappe.model.set_value(
      cdt,
      cdn,
      'difference_amount',
      collected_amount - expected_amount
    );
    frm.set_value(
      'total_collected',
      frm.doc.payments
        .filter(({ type }) => type === 'Cash')
        .reduce((a, { collected_amount = 0 }) => a + collected_amount, 0)
    );
  },
});
