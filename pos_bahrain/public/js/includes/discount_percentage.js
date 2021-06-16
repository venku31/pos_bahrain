frappe.ui.form.on('Quotation', {
  pb_discount_percentage: function (frm) {
    frm.doc.items.forEach(({ doctype, name }) => {
      frappe.model.set_value(doctype, name, 'discount_percentage', frm.doc.pb_discount_percentage);
    });
  },
});

frappe.ui.form.on('Quotation Item', {
  item_code: function (frm, cdt, cdn) {
    setTimeout(function () {
      frappe.model.set_value(cdt, cdn, 'discount_percentage', frm.doc.pb_discount_percentage);
    }, 300);
  },
});
