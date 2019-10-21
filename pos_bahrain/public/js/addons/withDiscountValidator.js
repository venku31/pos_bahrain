export default function withDiscountValidator(Pos) {
  return class PosExtended extends Pos {
    validate() {
      super.validate();
      const { pb_max_discount: max_discount } = this.pos_profile_data;
      if (max_discount) {
        this.frm.doc.items.forEach(
          ({ net_amount = 0, price_list_rate, idx }) => {
            const discount = (1 - net_amount / price_list_rate) * 100;
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
