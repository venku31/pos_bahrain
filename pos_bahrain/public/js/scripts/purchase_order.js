import { set_uom_query } from './sales_invoice';
import { set_item_from_supplier_pn } from './purchase_invoice';

const purchase_order_item = {
  pb_supplier_part_no: set_item_from_supplier_pn,
};

export default {
  purchase_order_item,
  setup: set_uom_query,
  schedule_date: function(frm) {
    const { schedule_date } = frm.doc;
    frm.doc.items.forEach(({ doctype: cdt, name: cdn }) => {
      frappe.model.set_value(cdt, cdn, 'schedule_date', schedule_date);
    });
  },
};
