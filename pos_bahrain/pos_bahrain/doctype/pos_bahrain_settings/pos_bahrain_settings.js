// Copyright (c) 2019, 	9t9it and contributors
// For license information, please see license.txt

frappe.ui.form.on('POS Bahrain Settings', {
  onload: function(frm) {
    frm.trigger('handle_price_list_fields');
  },
  discount_on_retail: function(frm) {
    frm.trigger('handle_price_list_fields');
  },
  handle_price_list_fields: function(frm) {
    const { discount_on_retail } = frm.doc;
    frm.toggle_reqd(
      ['retail_price_list', 'wholesale_price_list'],
      discount_on_retail
    );
  },
});
