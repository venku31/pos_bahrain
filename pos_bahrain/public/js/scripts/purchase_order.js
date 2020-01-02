import { set_uom_query } from './sales_invoice';
import { set_item_from_supplier_pn } from './purchase_invoice';

async function set_actual_qty(frm, cdt, cdn) {
  const { item_code, warehouse } = frappe.get_doc(cdt, cdn) || {};
  if (item_code && warehouse) {
    const { message: { actual_qty } = {} } = await frappe.call({
      method: 'erpnext.stock.get_item_details.get_bin_details',
      args: { item_code, warehouse },
    });
    frappe.model.set_value(cdt, cdn, 'pb_actual_qty', actual_qty);
  }
}

async function fetch_from_supplier(frm) {
  const { supplier, company } = frm.doc;
  if (!supplier) {
    frappe.throw(__('Cannot fetch Items without Supplier'));
  }
  const { message: item_codes = [] } = await frappe.call({
    method: 'pos_bahrain.api.item.get_supplier_items',
    args: { supplier, company },
  });
  await frm.set_value('items', []);
  item_codes.forEach(item_code => {
    const { doctype: cdt, name: cdn } = frm.add_child('items');
    frappe.model.set_value(cdt, cdn, 'item_code', item_code);
  });
}

const purchase_order_item = {
  pb_supplier_part_no: set_item_from_supplier_pn,
  item_code: set_actual_qty,
  warehouse: set_actual_qty,
};

export default {
  purchase_order_item,
  setup: set_uom_query,
  pb_get_items_from_default_supplier: fetch_from_supplier,
  schedule_date: function(frm) {
    const { schedule_date } = frm.doc;
    frm.doc.items.forEach(({ doctype: cdt, name: cdn }) => {
      frappe.model.set_value(cdt, cdn, 'schedule_date', schedule_date);
    });
  },
};
