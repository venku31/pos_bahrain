export async function set_rate_from_batch(frm, cdt, cdn) {
  if (!frappe.boot.pos_bahrain.use_batch_price) {
    return;
  }
  const { batch_no, conversion_factor = 1 } = frappe.get_doc(cdt, cdn) || {};
  if (!batch_no) {
    return;
  }
  const {
    message: {
      pb_price_based_on: based_on,
      pb_rate: rate,
      pb_discount: discount_percentage,
    } = {},
  } = await frappe.db.get_value('Batch', batch_no, [
    'pb_price_based_on',
    'pb_rate',
    'pb_discount',
  ]);
  if (based_on === 'Based on Rate') {
    frappe.model.set_value(cdt, cdn, { rate: rate * conversion_factor });
  } else if (based_on === 'Based on Discount') {
    frappe.model.set_value(cdt, cdn, { discount_percentage });
  }
}

export async function set_uom(frm, cdt, cdn) {
  if (!frappe.boot.pos_bahrain.use_barcode_uom) {
    return;
  }
  const { barcode, stock_uom } = frappe.get_doc(cdt, cdn) || {};
  if (!barcode) {
    return;
  }
  const { message: uom } = await frappe.call({
    method: 'pos_bahrain.api.item.get_uom_from',
    args: { barcode },
  });
  frappe.model.set_value(cdt, cdn, { uom: uom || stock_uom });
}

export function set_uom_query(frm) {
  frm.set_query('uom', 'items', function(doc, cdt, cdn) {
    const { item_code } = frappe.get_doc(cdt, cdn) || {};
    return {
      query: 'pos_bahrain.api.item.query_uom',
      filters: { item_code },
    };
  });
}

const sales_invoice_item = {
  batch_no: set_rate_from_batch,
  barcode: set_uom,
};

export default {
  sales_invoice_item,
  setup: set_uom_query,
};
