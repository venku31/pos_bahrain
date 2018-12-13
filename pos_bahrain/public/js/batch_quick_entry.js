// Copyright (c) 2018, 	9t9it and contributors
// For license information, please see license.txt

frappe.ui.form.BatchQuickEntryForm = frappe.ui.form.QuickEntryForm.extend({
  render_dialog: async function() {
    this._super();
    if (cur_frm) {
      const { doctype, item_code } = cur_frm.selected_doc || {};
      if (['Stock Entry Detail', 'Purchase Receipt Item'].includes(doctype)) {
        this.dialog.set_value('item', item_code);
        const { message: item } = await frappe.db.get_value(
          'Item',
          item_code,
          'create_new_batch'
        );
        if (cint(item.create_new_batch)) {
          this.dialog.fields_dict['batch_id'].hidden = 1;
          this.dialog.refresh('batch_id');
        }
      }
    }
  },
});
