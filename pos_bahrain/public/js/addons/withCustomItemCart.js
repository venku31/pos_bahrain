export default function withCustomItemCart(Pos) {
    return class PosExtended extends Pos {
        async init_master_data(r, freeze) {
            const pos_data = await super.init_master_data(r, freeze);
            const { use_custom_item_cart } = pos_data;

            this.use_custom_item_cart = cint(use_custom_item_cart);

            if (this.use_custom_item_cart) {
                const { message: item_cart_fields } = await frappe.call({
                    method: 'pos_bahrain.api.item.get_custom_item_cart_fields',
                    freeze,
                    freeze_message: __('Getting custom item cart fields'),
                });

                if (!item_cart_fields) {
                    frappe.throw(
                        __('Set the item cart fields under POS Bahrain Settings')
                    );
                }

                this.item_cart_fields = item_cart_fields;
                this.make_control(); // for async
            }

            return pos_data;
        }
        make_control() {
            super.make_control();

            const { use_custom_item_cart } = this;

            if (use_custom_item_cart) {
                const $header = this.wrapper.find(".item-cart > .pos-bill-header").empty();
                this._render_custom_item_cart_fields($header);
            }
        }
        show_items_in_item_cart() {
            const { use_custom_item_cart } = this;

            if (!use_custom_item_cart) {
                super.show_items_in_item_cart();
            }
        }
        _render_custom_item_cart_fields($header) {
            const { item_cart_fields } = this;
            item_cart_fields.forEach(field => {
                $header.append(`
                    <span class="cell">${__(field.label)}</span>
                `);
            })
        }
    };
}