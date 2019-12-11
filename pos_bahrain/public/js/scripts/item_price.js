export default {
  setup: function(frm) {
    frm.set_query('uom', function({ item_code }) {
      return {
        query: 'pos_bahrain.api.item.query_uom',
        filters: { item_code },
      };
    });
  },
  uom: async function(frm) {
    const { item_code, uom } = frm.doc;
    const { message: pb_conversion_factor } = await frappe.call({
      method: 'pos_bahrain.api.item.get_conversion_factor',
      args: { item_code, uom },
    });
    frm.set_value({ pb_conversion_factor });
  },
};
