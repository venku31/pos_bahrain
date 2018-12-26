// Copyright (c) 2018, 	9t9it and contributors
// For license information, please see license.txt

frappe.ui.form.on('POS Closing Voucher', {
  onload: async function(frm) {
    const { period_to = frappe.datetime.now_datetime(), fetch_data } =
      frappe.route_options || {};
    if (fetch_data) {
      await frm.set_value('period_to', period_to);
      frm.trigger('fetch_and_set_data');
    } else if (frm.doc.docstatus === 0 && !frm.doc.period_to) {
      frm.set_value('period_to', period_to);
    }
    ['payments', 'invoices', 'returns', 'taxes'].forEach(field => {
      frm.set_df_property(field, 'read_only', 1);
    });
  },
  fetch_and_set_data: async function(frm) {
    const { period_from, period_to, company, pos_profile, user } = frm.doc;
    const {
      message: { invoices = [], returns = [], payments = [], taxes = [] } = {},
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
    const net_total = invoices.reduce(
      (a, { net_total = 0 }) => a + net_total,
      0
    );
    frm.set_value('net_total', net_total);
    frm.set_value('total_invoices', invoices.length);
    frm.set_value('average_sales', net_total / flt(invoices.length));
    frm.set_value(
      'total_quantity',
      invoices.reduce((a, { pos_total_qty = 0 }) => a + pos_total_qty, 0)
    );
    frm.set_value(
      'tax_total',
      taxes.reduce((a, { tax_amount = 0 }) => a + tax_amount, 0)
    );
    const change_total = invoices.reduce(
      (a, { change_amount = 0 }) => a + change_amount,
      0
    );
    frm.set_value(
      'returns_total',
      returns.reduce((a, { grand_total = 0 }) => a + grand_total, 0)
    );
    frm.set_value('change_total', change_total);
    frm.clear_table('payments');
    payments.forEach(
      ({
        mode_of_payment,
        base_amount = 0,
        mop_currency,
        mop_amount = 0,
        is_default,
        ...rest
      }) => {
        const mop_conversion_rate = mop_amount ? base_amount / mop_amount : 1;
        const expected_amount = is_default
          ? base_amount - change_total
          : mop_amount || base_amount;
        frm.add_child(
          'payments',
          Object.assign({ mode_of_payment }, rest, {
            is_default,
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
    frm.clear_table('returns');
    returns.forEach(
      ({ name: invoice, pos_total_qty: total_quantity, ...rest }) => {
        frm.add_child(
          'returns',
          Object.assign({}, rest, { invoice, total_quantity })
        );
      }
    );
    frm.refresh_field('returns');
    frm.clear_table('taxes');
    taxes.forEach(tax => {
      frm.add_child('taxes', tax);
    });
    frm.refresh_field('taxes');
    frm.trigger('set_closing_amount');
  },
  opening_amount: function(frm) {
    frm.trigger('set_closing_amount');
  },
  set_closing_amount: function(frm) {
    const { opening_amount } = frm.doc;
    const { collected_amount = 0 } =
      frm.doc.payments.find(({ is_default }) => is_default === 1) || {};
    frm.set_value('closing_amount', opening_amount + collected_amount);
  },
});

frappe.ui.form.on('POS Voucher Payment', {
  collected_amount: async function(frm, cdt, cdn) {
    const {
      collected_amount,
      expected_amount,
      mop_conversion_rate,
      is_default,
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
    if (is_default) {
      frm.trigger('set_closing_amount');
    }
  },
});
