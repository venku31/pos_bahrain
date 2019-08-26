export default function withStockValidator(Pos) {
    return class PosExtended extends Pos {
        validate() {
            super.validate();
            this._validate_qty();
        }
        _validate_qty() {
            this.frm.doc.items.forEach(item => {
                if (item.qty > item.actual_qty) {
                    frappe.throw(__("Qty is greater than the actual qty."));
                }
            });
        }
    };
}