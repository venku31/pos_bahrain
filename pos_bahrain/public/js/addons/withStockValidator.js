export default function withStockValidator(Pos) {
    return class PosExtended extends Pos {
        async init_master_data(r, freeze) {
            const pos_data = await super.init_master_data(r, freeze);
            const { use_stock_validator } = pos_data;
            this.use_stock_validator = !!cint(use_stock_validator);
            return pos_data;
        }
        validate() {
            super.validate();

            if (this.use_stock_validator) {
                this._validate_qty();
            }
        }
        _validate_qty() {
            this.items_qty = {};
            this.batch_qty = {};

            this.frm.doc.items.forEach(item => {
                if (item.batch_no) {
                    this._validate_batch_qty(item);
                } else {
                    this._validate_non_batch_qty(item);
                }
            });
        }
        _validate_batch_qty(item) {
            const { item_code, batch_no, qty, conversion_factor } = item;

            if (!(batch_no in this.batch_qty)) {
                const batch = this._get_batch(item_code, batch_no);
                this.batch_qty[batch_no] = batch[0].qty;
            }

            const selected_qty = qty * conversion_factor;
            this.batch_qty[batch_no] = this.batch_qty[batch_no] - selected_qty;
            if (this.batch_qty[batch_no] < 0) {
                frappe.throw(__("Qty is greater than the batch qty."));
            }
        }
        _validate_non_batch_qty(item) {
            const { item_code, actual_qty, qty, conversion_factor } = item;

            if (!(item_code in this.items_qty)) {
                this.items_qty[item_code] = actual_qty;
            }

            const selected_qty = qty * conversion_factor;
            this.items_qty[item_code] = this.items_qty[item_code] - selected_qty;
            if (this.items_qty[item_code] < 0) {
                frappe.throw(__("Qty is greater than the actual qty."));
            }
        }
        _get_batch(item, batch_no) {
            const item_batches = this.batch_no_details[item];
            return item_batches.filter((item_batch) =>
                item_batch.name === batch_no
            );
        }
    };
}