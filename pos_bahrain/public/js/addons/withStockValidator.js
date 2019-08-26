export default function withStockValidator(Pos) {
    return class PosExtended extends Pos {
        validate() {
            super.validate();
            this._validate_qty();
        }
        _validate_qty() {
            const items_qty = {};
            this.frm.doc.items.forEach(item => {
                if (!(item.item_code in items_qty)) {
                    items_qty[item.item_code] = item.actual_qty;
                }

                items_qty[item.item_code] = items_qty[item.item_code] - item.qty;
                if (items_qty[item.item_code] < 0) {
                    frappe.throw(__("Qty is greater than the actual qty."));
                }
            });
        }
    };
}