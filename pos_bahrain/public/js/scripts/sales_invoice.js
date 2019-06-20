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

const sales_invoice_item = {
  batch_no: set_rate_from_batch,
};

export default {
  sales_invoice_item,
};
