import first from 'lodash/first';

export default function withBarcodeUom(Pos) {
  return class PosExtended extends Pos {
    async init_master_data(r, freeze) {
      const pos_data = await super.init_master_data(r, freeze);
      const { use_barcode_uom, barcode_details } = pos_data;
      this.use_barcode_uom = !!cint(use_barcode_uom);
      this.barcode_details = barcode_details;
      this.barcode = null;
      return pos_data;
    }
    make_item_list() {
      this.barcode =
        this.use_barcode_uom &&
        this.barcode_details &&
        this.barcode_details[this.search_item.$input.val()];
      super.make_item_list();
    }
    _set_item_uom(item_code, uom, barcode = null) {
      const item = this.frm.doc.items.find(x => x.item_code === item_code);
      if (item && uom) {
        const { conversion_factor = 1 } = (
          this.uom_details[item_code] || []
        ).find(x => x.uom === uom);
        Object.assign(item, { barcode, uom, conversion_factor });
      }
    }
    add_to_cart() {
      super.add_to_cart();
      if (this.use_barcode_uom) {
        if (this.barcode) {
          const { item_code, uom, barcode } = this.barcode;
          this._set_item_uom(item_code, uom, barcode);
          this.barcode = null;
        } else {
          const { item_code, stock_uom: uom } = first(this.items) || {};
          this._set_item_uom(item_code, uom);
        }
      }
    }
  };
}
