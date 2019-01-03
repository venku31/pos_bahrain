// Copyright (c) 2018, 	9t9it and contributors
// For license information, please see license.txt

async function set_retail_price(frm, cdt, cdn) {
  const { item_code } = frappe.get_doc(cdt, cdn);
  if (item_code) {
    const { message: retail_price } = await frappe.call({
      method: 'pos_bahrain.api.item.get_retail_price',
      args: { item_code },
    });
    frappe.model.set_value(cdt, cdn, 'retail_price', retail_price);
  } else {
    frappe.model.set_value(cdt, cdn, 'retail_price', null);
  }
}

frappe.ui.form.on('Purchase Invoice Item', {
  item_code: set_retail_price,
});
frappe.ui.form.on('Purchase Order Item', {
  item_code: set_retail_price,
});
