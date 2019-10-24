export default function withDiscountValidator(Pos) {
  return class PosExtended extends Pos {
    validate() {
      super.validate();
      const { pb_max_discount: max_discount } = this.pos_profile_data;
      if (max_discount) {
        this.frm.doc.items.forEach(
          ({ item_code, uom, net_amount = 0, qty, idx }) => {
            const net_rate = net_amount / qty;
            const price = this.get_item_price({ item_code, uom });

            const discount = (1 - net_rate / price) * 100;
            if (discount > max_discount) {
              frappe.throw(
                __(
                  `Discount for row #${idx}: ${discount.toFixed(
                    2
                  )}% cannot be greater than ${max_discount}%`
                )
              );
            }
          }
        );
      }
    }
  };
}
