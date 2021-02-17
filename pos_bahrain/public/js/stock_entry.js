// Copyright (c) 2018, 	9t9it and contributors
// For license information, please see license.txt

frappe.ui.form.off('Stock Entry Detail', 'item_code');
frappe.ui.form.on('Stock Entry Detail', {
  item_code: pos_bahrain.scripts.extensions.stock_entry_item_code,
  t_warehouse: function (frm, cdt, cdn) {
    _set_cost_center(frm, cdt, cdn);
  },
});


function _set_cost_center(frm, cdt, cdn) {
  const data = locals[cdt][cdn];
  _get_cost_center(data.t_warehouse).then((cost_center) => {
    if (cost_center) {
      frappe.model.set_value(cdt, cdn, 'cost_center', cost_center);
    }
  });
}


async function _get_cost_center(warehouse) {
  const { message: data } = await frappe.db.get_value('Warehouse', warehouse, 'pb_cost_center');
  return data.pb_cost_center ? data.pb_cost_center : null;
}
