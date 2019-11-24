import { set_uom_query } from './sales_invoice';
import { set_item_from_supplier_pn } from './purchase_invoice';

const purchase_receipt_item = {
  pb_supplier_part_no: set_item_from_supplier_pn,
};

export default {
  purchase_receipt_item,
  setup: set_uom_query,
};
