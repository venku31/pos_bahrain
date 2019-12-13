import { set_uom_query } from './sales_invoice';

function set_batch_query(frm) {
  frm.set_query('batch', 'items', function(doc, cdt, cdn) {
    const { item_code: item } = frappe.get_doc(cdt, cdn) || {};
    return { filters: { item } };
  });
}

async function set_item_price(frm, cdt, cdn) {
  const { price_list } = frm.doc;
  const { item_code, uom } = frappe.get_doc(cdt, cdn);
  const { message: rate } = await frappe.call({
    method: 'pos_bahrain.api.item.get_item_rate',
    args: { item_code, uom, price_list },
  });
  frappe.model.set_value(cdt, cdn, 'rate', rate);
}

const barcode_print_item = {
  item_code: set_item_price,
  uom: set_item_price,
};

export default {
  barcode_print_item,
  setup: function(frm) {
    set_uom_query(frm);
    set_batch_query(frm);
  },
  refresh: function(frm) {
    frm.disable_save();
    const is_print_preview =
      frm.page.current_view_name === 'print' || frm.hidden;
    const action_label = is_print_preview ? 'Edit' : 'Print';
    frm.page.set_primary_action(action_label, async function() {
      await frm.save();
      frm.print_doc();
    });
    frm.page.set_secondary_action('Clear', async function() {
      frm.clear_table('items');
      frm.refresh_field('items');
    });
    frm.page.btn_secondary.toggle(!is_print_preview);
  },
};
