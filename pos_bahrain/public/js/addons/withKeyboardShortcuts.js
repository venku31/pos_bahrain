export default function withKeyboardShortcuts(Pos) {
  return class PosExtended extends Pos {
    make_control() {
      super.make_control();
      this._bind_keyboard_shortcuts();
    }
    _bind_keyboard_shortcuts() {
      $(document).on('keydown', e => {
        if (frappe.get_route_str() === 'pos') {
          if (this.numeric_keypad && e.keyCode === 120) {
            e.preventDefault();
            e.stopPropagation();
            if (this.dialog && this.dialog.is_visible) {
              this.dialog.hide();
            } else {
              $(this.numeric_keypad)
                .find('.pos-pay')
                .trigger('click');
            }
          } else if (
            this.frm.doc.docstatus == 1 &&
            e.ctrlKey &&
            e.keyCode === 80
          ) {
            e.preventDefault();
            e.stopPropagation();
            if (this.msgprint) {
              this.msgprint.msg_area.find('.print_doc').click();
            } else {
              this.page.btn_secondary.trigger('click');
            }
          } else if (e.ctrlKey && e.keyCode === 66) {
            e.preventDefault();
            e.stopPropagation();
            if (this.msgprint) {
              console.log('new_doc');
              this.msgprint.msg_area.find('.new_doc').click();
            } else {
              this.page.btn_primary.trigger('click');
            }
          }
        }
      });
    }
  };
}
