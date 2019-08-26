// depends on withPaymentValidator
export default function withMorePaymentActions(Pos) {
  return class PosExtended extends Pos {
    make_payment() {
      super.make_payment();
      $(
        `<button type="button" class="btn btn-info btn-sm">Submit & Pay</button>`
      )
        .click(() => {
          this._validate_payment();
          this.dialog.hide();
          this.submit_invoice();
          this.print_document(
            frappe.render(this.print_template_data, this.frm.doc)
          );
        })
        .appendTo(this.dialog.header.find('.buttons'));
    }
  };
}
