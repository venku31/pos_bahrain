export default function withPaymentValidator(Pos) {
  return class PosExtended extends Pos {
    async init_master_data(r, freeze) {
      const pos_data = await super.init_master_data(r, freeze);
      const { do_not_allow_zero_payment } = pos_data;
      this.do_not_allow_zero_payment = !!cint(do_not_allow_zero_payment);
      return pos_data;
    }
    show_amounts() {
      super.show_amounts();
      if (this.do_not_allow_zero_payment) {
        this.dialog
          .get_primary_btn()
          .toggleClass('disabled', this.frm.doc.paid_amount === 0);
      }
    }
    set_payment_primary_action() {
      this.dialog.set_primary_action(__('Submit'), () => {
        this._validate_payment();
        this.dialog.hide();
        this.submit_invoice();
      });
    }
    _validate_payment() {
      if (this.do_not_allow_zero_payment) {
        const paid_amount = this.frm.doc.payments.reduce(
          (a, { amount = 0 }) => a + amount,
          0
        );
        if (!paid_amount) {
          return frappe.throw(__('Paid Amount cannot be zero'));
        }
      }
    }
  };
}
