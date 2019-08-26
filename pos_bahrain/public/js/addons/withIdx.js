// This is for easy reference of the .selected row (hacks)
export default function withIdx(Pos) {
    return class PosExtended extends Pos {
        show_items_in_item_cart() {
            super.show_items_in_item_cart();
            this._set_pos_bill_item_idx();
        }
        _set_pos_bill_item_idx() {
            const $items = $('div.items').children();
            $.each($items || [], function(i, item) {
               $(item).attr('data-idx', i);
            });
        }
    };
}