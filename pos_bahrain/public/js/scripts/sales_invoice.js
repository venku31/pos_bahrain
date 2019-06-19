async function set_rate_from_batch(frm, cdt, cdn) {
  const { batch_no, conversion_factor = 1 } = frappe.get_doc(cdt, cdn) || {};
  if (!batch_no) {
    return;
  }
  const use_batch_price = await frappe.db.get_single_value(
    'POS Bahrain Settings',
    'use_batch_price'
  );
  if (!use_batch_price) {
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
