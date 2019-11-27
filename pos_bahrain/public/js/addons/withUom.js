import first from 'lodash/first';
import mapValues from 'lodash/mapValues';
import keyBy from 'lodash/keyBy';
import get from 'lodash/get';

// depends on withIdx
export default function withUom(Pos) {
  return class PosExtended extends Pos {
    async init_master_data(r, freeze) {
      const pos_data = await super.init_master_data(r, freeze);
      const { uom_details, item_prices } = pos_data;
      if (!uom_details) {
        frappe.msgprint({
          indicator: 'orange',
          title: __('Warning'),
          message: __('Unable to load UOM details. Usage will be restricted.'),
        });
      }
      this.uom_details = uom_details;
      this.item_prices_by_uom = mapValues(item_prices, values =>
        keyBy(values, 'uom')
      );

      return pos_data;
    }
    add_new_item_to_grid() {
      super.add_new_item_to_grid();
      const { item_code, stock_uom: uom } = this.child;
      const rate = this.get_item_price({ item_code, uom });
      Object.assign(this.child, {
        uom,
        rate,
        price_list_rate: rate,
        conversion_factor: 1,
      });
    }
    get_item_price({ item_code, uom }) {
      const { conversion_factor = 1 } =
        (this.uom_details[item_code] || []).find(x => x.uom === uom) || {};

      const customer_wise = get(this.customer_wise_price_list, [
        this.frm.doc.customer,
        item_code,
      ]);
      if (customer_wise) {
        return flt(
          (customer_wise * conversion_factor) / this.frm.doc.conversion_rate,
          this.precision
        );
      }

      const uom_wise = get(this.item_prices_by_uom, [
        item_code,
        uom,
        'price_list_rate',
      ]);
      if (uom_wise) {
        return uom_wise;
      }

      return flt(
        (get(this.price_list_data, item_code, 0) * conversion_factor) /
          this.frm.doc.conversion_rate,
        this.precision
      );
    }
    _set_item_price_from_uom(item_code, uom) {
      const item = this._get_active_item_ref_from_doc();
      const uom_details = this.uom_details[item_code].find(x => x.uom === uom);
      if (item && uom_details) {
        const { conversion_factor = 1 } = uom_details;
        const price_list_rate = this.get_item_price({ item_code, uom });
        Object.assign(item, {
          uom,
          conversion_factor,
          rate: price_list_rate,
          price_list_rate,
          amount: flt(item.qty * price_list_rate, this.precision),
        });
        this.update_paid_amount_status(false);
      }
    }
    _get_active_item_ref_from_doc() {
      return this.frm.doc.items[this.selected_cart_idx];
    }
    render_selected_item() {
      super.render_selected_item();
      $(`
        <div class="pos-list-row">
          <div class="cell">${__('UOM')}:</div>
          <select type="text" class="form-control cell pos-item-uom" />
        </div>
      `).prependTo(this.wrapper.find('.pos-selected-item-action'));
      const $select = this.wrapper.find('.pos-item-uom');
      const selected_item = this._get_active_item_ref_from_doc();
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
        this._set_item_price_from_uom(this.item_code, e.target.value);
        this.render_selected_item();
      });
    }
  };
}
