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
    const {
      period_from,
      period_to,
      company,
      pos_profile,
      user,
      opening_amount = 0,
      total_collected = 0,
    } = frm.doc;
    const {
      message: {
        invoices = [],
        payments = [],
        taxes = [],
        noncash_amount = 0,
      } = {},
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
    frm.set_value('closing_amount', opening_amount + total_collected);
    frm.set_value('noncash_amount', noncash_amount);
    const existing_collected = frm.doc.payments
      ? frm.doc.payments.reduce(
          (a, { mode_of_payment, collected_amount = 0 }) =>
            Object.assign(a, { [mode_of_payment]: collected_amount }),
          {}
        )
      : {};
    frm.clear_table('payments');
    payments.forEach(
      ({
        mode_of_payment,
        base_amount = 0,
        mop_currency,
        mop_amount = 0,
        ...rest
      }) => {
        const collected_amount = existing_collected[mode_of_payment] || 0;
        const expected_amount = mop_amount || base_amount;
        const base_collected_amount = expected_amount
          ? (base_amount / expected_amount) * collected_amount
          : collected_amount;
        frm.add_child(
          'payments',
          Object.assign({ mode_of_payment }, rest, {
            base_collected_amount,
            base_expected_amount: base_amount,
            collected_amount,
            expected_amount,
            difference_amount: -expected_amount,
            mop_currency:
              mop_currency || frappe.defaults.get_default('currency'),
          })
        );
      }
    );
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
  collected_amount: async function(frm, cdt, cdn) {
    const {
      collected_amount,
      expected_amount,
      base_expected_amount,
    } = frappe.get_doc(cdt, cdn);
    frappe.model.set_value(
      cdt,
      cdn,
      'difference_amount',
      collected_amount - expected_amount
    );
    await frappe.model.set_value(
      cdt,
      cdn,
      'base_collected_amount',
      expected_amount
        ? (base_expected_amount / expected_amount) * collected_amount
        : collected_amount
    );
    frm.set_value(
      'total_collected',
      frm.doc.payments.reduce(
        (a, { base_collected_amount = 0 }) => a + base_collected_amount,
        0
      )
    );
  },
});
