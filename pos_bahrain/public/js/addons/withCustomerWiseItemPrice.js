import mapValues from 'lodash/mapValues';
import groupBy from 'lodash/groupBy';
import get from 'lodash/get';
import keyBy from 'lodash/keyBy';
import merge from 'lodash/merge';

// depends on withUom
export default function withCustomerWiseItemPrice(Pos) {
  return class PosExtended extends Pos {
    async init_master_data(r, freeze) {
      const pos_data = await super.init_master_data(r, freeze);
      const { item_prices } = pos_data;
      this.item_prices_by_customer = mapValues(item_prices, values =>
        groupBy(values.filter(({ customer }) => customer), 'customer')
      );
      const customer_wise_price_list = mapValues(
        groupBy(
          Object.values(item_prices)
            .flat()
            .filter(({ customer }) => !!customer),
          'customer'
        ),
        values =>
          mapValues(
            keyBy(values, 'item_code'),
            ({ price_list_rate }) => price_list_rate
          )
      );
      this.customer_wise_price_list = merge(
        this.customer_wise_price_list,
        customer_wise_price_list
      );
      this.make_item_list(this.default_customer);
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
