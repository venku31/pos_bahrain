export default function withBatchPrice(PosClass) {
  class PosClassExtended extends PosClass {
    async init_master_data(r, freeze) {
      const pos_data = await super.init_master_data(r, freeze);
      this.use_batch_price = !!cint(pos_data.use_batch_price);
      return pos_data;
    }
    _set_item_price(item_code, batch_no) {
      const {
        pb_price_based_on: based_on,
        pb_rate: rate,
        pb_discount: discount_percentage,
      } =
        this.batch_no_details[item_code].find(
          ({ name }) => name === batch_no
        ) || {};
      const item = this.frm.doc.items.find(
        item => item.item_code === item_code
      );
      if (item) {
        if (based_on === 'Based on Rate') {
          item.rate = rate * item.conversion_factor;
        } else if (based_on === 'Based on Discount') {
          item.discount_percentage = discount_percentage;
        } else {
          item.rate = this.price_list_data[item_code] * item.conversion_factor;
          item.discount_percentage = 0;
        }
        this.update_paid_amount_status(false);
      }
    }
    mandatory_batch_no() {
      super.mandatory_batch_no();
      this.batch_dialog.get_primary_btn().on('click', () => {
        if (this.use_batch_price) {
          const { item_code } = this.items[0];
          const batch_no = this.batch_dialog.get_value('batch');
          this._set_item_price(item_code, batch_no);
        }
      });
    }
    render_selected_item() {
      super.render_selected_item();
      const { item_code, batch_no } =
        this.frm.doc.items.find(item => this.item_code === item.item_code) ||
        {};
      this.wrapper.find('.pos-item-uom').on('change', () => {
        if (item_code && batch_no) {
          this._set_item_price(item_code, batch_no);
        }
      });
    }
  }
  return PosClassExtended;
}
