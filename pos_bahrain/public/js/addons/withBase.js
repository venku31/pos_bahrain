import keyBy from 'lodash/keyBy';

export default function withBase(Pos) {
  return class PosExtended extends Pos {
    onload() {
      super.onload();
      this.precision =
        frappe.defaults.get_default('currency_precision') ||
        frappe.defaults.get_default('float_precision');
    }
    async init_master_data(r, freeze) {
      const pos_data = await super.init_master_data(r, freeze);
      this.items_by_item_code = keyBy(this.item_data, 'name');
      return pos_data;
    }
  };
}
