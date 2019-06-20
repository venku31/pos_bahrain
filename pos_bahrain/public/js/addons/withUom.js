import first from 'lodash/first';

export default function withUom(Pos) {
  return class PosExtended extends Pos {
    async init_master_data(r, freeze) {
      const pos_data = await super.init_master_data(r, freeze);
      const { uom_details } = pos_data;
      if (!uom_details) {
        frappe.msgprint({
          indicator: 'orange',
          title: __('Warning'),
          message: __('Unable to load UOM details. Usage will be restricted.'),
        });
      }
      this.uom_details = uom_details;
      return pos_data;
    }
    add_new_item_to_grid() {
      super.add_new_item_to_grid();
      const { stock_uom, conversion_factor = 1 } = first(this.items) || {};
      Object.assign(this.child, { uom: stock_uom, conversion_factor });
    }
    render_selected_item() {
      super.render_selected_item();
      $(`
        <div class="pos-list-row">
          <div class="cell">${__('UOM')}:</div>
          <select type="text" class="form-control cell pos-item-uom" />
        </div>
      `).prependTo(this.wrapper.find('.pos-selected-item-action'));
      const $select = this.wrapper.find('.pos-item-uom').off('change');
      const selected_item = this.frm.doc.items.find(
        ({ item_code }) => this.item_code === item_code
      );
      this.uom_details[this.item_code].forEach(({ uom }) => {
        $('<option />', {
          value: uom,
          selected: selected_item && uom === selected_item.uom,
        })
          .text(`${uom}`)
          .appendTo($select);
      });
      $select.on('change', e => {
        e.stopPropagation();
        const { uom, conversion_factor = 1 } = this.uom_details[
          this.item_code
        ].find(({ uom }) => uom === e.target.value);
        if (uom && selected_item) {
          const rate =
            (flt(this.price_list_data[this.item_code]) *
              flt(conversion_factor)) /
            flt(this.frm.doc.conversion_rate);
          Object.assign(selected_item, {
            uom,
            conversion_factor,
            rate,
            price_list_rate: rate,
            amount: flt(selected_item.qty) * rate,
          });
        }
        this.render_selected_item();
        this.update_paid_amount_status(false);
      });
    }
  };
}
