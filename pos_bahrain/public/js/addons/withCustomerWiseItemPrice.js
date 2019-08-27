import mapValues from 'lodash/mapValues';
import groupBy from 'lodash/groupBy';
import get from 'lodash/get';

// depends on withUom
export default function withCustomerWiseItemPrice(Pos) {
  return class PosExtended extends Pos {
    async init_master_data(r, freeze) {
      const pos_data = await super.init_master_data(r, freeze);
      const { item_prices } = pos_data;
      this.item_prices_by_customer = mapValues(item_prices, values =>
        groupBy(values, 'customer')
      );
      return pos_data;
    }
    get_item_price({ item_code, uom }) {
      const customer_prices = get(this.item_prices_by_customer, [
        item_code,
        this.frm.doc.customer,
      ]);
      if (customer_prices && customer_prices.length > 0) {
        const customer_wise = customer_prices.find(price => price.uom === uom);
        if (customer_wise) {
          return customer_wise.price_list_rate;
        }
      }
      return super.get_item_price({ item_code, uom });
    }
  };
}
