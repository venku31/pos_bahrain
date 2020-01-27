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
    set_payment_primary_action() {
      this.dialog.set_primary_action(
        __('Submit'),
        this.payment_primary_action.bind(this)
      );
    }
    payment_primary_action() {
      // callback for the 'Submit' button in the payment modal. copied from upstream.
      // implemented as a class method to make the callback extendable from
      // subsequent hocs

      // Allow no ZERO payment
      $.each(this.frm.doc.payments, (index, data) => {
        if (data.amount != 0) {
          this.dialog.hide();
          this.submit_invoice();
          return;
        }
      });
    }
  };
}
