function handle_price_list_fields(frm) {
  const { discount_on_retail } = frm.doc;
  frm.toggle_reqd(
    ['retail_price_list', 'wholesale_price_list'],
    discount_on_retail
  );
}

export default {
  onload: handle_price_list_fields,
  discount_on_retail: handle_price_list_fields,
};
