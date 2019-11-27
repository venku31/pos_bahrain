export default {
  setup: function(frm) {
    frm.set_query('uom', function({ item_code }) {
      return {
        query: 'pos_bahrain.api.item.query_uom',
        filters: { item_code },
      };
    });
  },
};
