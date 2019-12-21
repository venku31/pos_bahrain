export default function withModifiedPaymentDialogFields(Pos) {
  return class PosExtended extends Pos {
    make_payment() {
      if (this.dialog) {
        this.dialog.$wrapper.remove();
      }
      super.make_payment();
      ['.change_amount', '.write_off_amount'].forEach(selector => {
        this.dialog.$body
          .find(selector)
          .parent()
          .parent()
          .addClass('hidden');
      });
      $(
        `<div class="col-xs-6 col-sm-3 text-center">
          <p style="font-size: 16px;">Change</p>
          <h3 class="change_amount_static">${format_currency(
            this.frm.doc.change_amount,
            this.frm.doc.currency
          )}</h3>
        </div>`
      ).appendTo(this.dialog.$body.find('.amount-row'));
    }
    show_amounts() {
      super.show_amounts();
      $(this.$body)
        .find('.change_amount_static')
        .text(
          format_currency(this.frm.doc.change_amount, this.frm.doc.currency)
        );
    }
  };
}
