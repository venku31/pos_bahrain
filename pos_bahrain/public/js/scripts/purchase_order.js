import { set_uom_query } from './sales_invoice';
import { set_item_from_supplier_pn } from './purchase_invoice';

async function set_actual_qty(frm, cdt, cdn) {
  const { item_code, warehouse: items_warehouse } =
    frappe.get_doc(cdt, cdn) || {};
  const { set_warehouse: doc_warehouse } = frm.doc;
  const warehouse = items_warehouse || doc_warehouse;
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

function override_update_items_button(frm) {
  // hack to show item_name. the condition to run this is the same as the one to
  // dd_custom_button in upstream `refresh`
  // https://github.com/frappe/erpnext/blob/440a3b75be6a8ee7c7baae4b3e2e484203dedcea/erpnext/buying/doctype/purchase_order/purchase_order.js#L49
  if (
    frm.doc.docstatus === 1 &&
    frm.doc.status !== 'Closed' &&
    flt(frm.doc.per_received) < 100 &&
    flt(frm.doc.per_billed) < 100
  ) {
    const data = frm.doc.items.map(
      ({ name, item_code, item_name, qty, rate }) => ({
        docname: name,
        name,
        item_code,
        item_name,
        qty,
        rate,
      })
    );
    const wait_for_button = setInterval(() => {
      const update_items_btn = frm.page.inner_toolbar.find(
        `button:contains("${__('Update Items')}")`
      );
      if (update_items_btn.length > 0) {
        update_items_btn.on('click', () => {
          const wait_for_dialog = setInterval(() => {
            if (cur_dialog) {
              cur_dialog.fields_dict.trans_items.df.data = data;
              cur_dialog.fields_dict.trans_items.df.get_data = () => data;
              cur_dialog.fields_dict.trans_items.grid.refresh();
              clearInterval(wait_for_dialog);
            }
          }, 300);
        });
        clearInterval(wait_for_button);
      }
    }, 60);
  }
}

export default {
  purchase_order_item,
  setup: set_uom_query,
  refresh: override_update_items_button,
  pb_get_items_from_default_supplier: fetch_from_supplier,
  schedule_date: function(frm) {
    const { schedule_date } = frm.doc;
    frm.doc.items.forEach(({ doctype: cdt, name: cdn }) => {
      frappe.model.set_value(cdt, cdn, 'schedule_date', schedule_date);
    });
  },
};
