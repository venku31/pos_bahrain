export default function withModifiedPaymentDialogFields(Pos) {
  return class PosExtended extends Pos {
    make_payment() {
      if (this.dialog) {
        this.dialog.$wrapper.remove();
      }
      super.make_payment();
      ['.write_off_amount'].forEach(selector => {
        this.dialog.$body
          .find(selector)
          .parent()
          .parent()
          .addClass('hidden');
      });
    }
  };
}
