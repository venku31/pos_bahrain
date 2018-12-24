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
    ['payments', 'invoices', 'taxes'].forEach(field => {
      frm.set_df_property(field, 'read_only', 1);
    });
  },
  fetch_and_set_data: async function(frm) {
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
    frm.set_value(
      'change_total',
      invoices.reduce((a, { change_amount = 0 }) => a + change_amount, 0)
    );
    frm.clear_table('payments');
    payments.forEach(
      ({
        mode_of_payment,
        base_amount = 0,
        mop_currency,
        mop_amount = 0,
        ...rest
      }) => {
        const expected_amount = mop_amount || base_amount;
        const mop_conversion_rate = expected_amount
          ? base_amount / expected_amount
          : 1;
        frm.add_child(
          'payments',
          Object.assign({ mode_of_payment }, rest, {
            collected_amount: expected_amount,
            expected_amount,
            difference_amount: 0,
            mop_currency:
              mop_currency || frappe.defaults.get_default('currency'),
            mop_conversion_rate,
            base_collected_amount: expected_amount * flt(mop_conversion_rate),
          })
        );
      }
    );
    frm.refresh_field('payments');
    frm.clear_table('invoices');
    invoices.forEach(
      ({ name: invoice, pos_total_qty: total_quantity, ...rest }) => {
        frm.add_child(
          'invoices',
          Object.assign({}, rest, { invoice, total_quantity })
        );
      }
    );
    frm.refresh_field('invoices');
    frm.clear_table('taxes');
    taxes.forEach(tax => {
      frm.add_child('taxes', tax);
    });
    frm.refresh_field('taxes');
  },
  opening_amount: function(frm) {
    frm.trigger('set_closing_amount');
  },
  change_total: function(frm) {
    frm.trigger('set_closing_amount');
  },
  set_closing_amount: function(frm) {
    const { opening_amount = 0, change_total = 0 } = frm.doc;
    const { collected_amount = 0 } =
      frm.doc.payments.find(mop => cint(mop.default) === 1) || {};
    frm.set_value(
      'closing_amount',
      opening_amount + collected_amount - change_total
    );
  },
});

frappe.ui.form.on('POS Voucher Payment', {
  collected_amount: async function(frm, cdt, cdn) {
    const {
      collected_amount,
      expected_amount,
      mop_conversion_rate,
      ...rest
    } = frappe.get_doc(cdt, cdn);
    frappe.model.set_value(
      cdt,
      cdn,
      'difference_amount',
      collected_amount - expected_amount
    );
    frappe.model.set_value(
      cdt,
      cdn,
      'base_collected_amount',
      collected_amount * flt(mop_conversion_rate)
    );
    if (rest.default) {
      frm.trigger('set_closing_amount');
    }
  },
});
