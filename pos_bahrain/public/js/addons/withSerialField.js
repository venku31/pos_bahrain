export default function withSerialField(Pos) {
    return class PosExtended extends Pos {
        render_selected_item() {
            super.render_selected_item();
            this._render_serial_field();
        }

        _render_serial_field() {
            const item = this.item_data.find(item => item.item_code === unescape(this.item_code));
            if (item.has_serial_no) {
                const $selected_item_action = this.wrapper.find('.pos-selected-item-action');
                $(`
                    <div class="pos-list-row">
                        <div class="cell">${__('Serial No')}:</div>
                        <input type="Select" class="form-control cell pos-item-serial" />
                    </div>
                `).prependTo($selected_item_action);

                const idx = this.wrapper.find('.pos-bill-item.active').data('idx');
                const item = this.frm.doc.items[idx];
                const $input = this.wrapper.find('.pos-item-serial');

                $input.val(item.serial_no || '');

                $input.on('change', e => {
                   e.stopPropagation();
                   item.serial_no = e.target.value;
                   this.render_selected_item();
                });
            }
        }
    };
}