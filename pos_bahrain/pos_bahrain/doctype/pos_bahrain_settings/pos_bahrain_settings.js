// Copyright (c) 2019, 	9t9it and contributors
// For license information, please see license.txt

frappe.ui.form.on(
  'POS Bahrain Settings',
  pos_bahrain.scripts.pos_bahrain_settings
);

frappe.ui.form.on('POS Bahrain Settings', {
	cancel_credit_note_jv(frm) {
	       frappe.call({
                      method:"pos_bahrain.events.jv_cancel.jv_cancel",
                    //   args: { 
                    //       name: d.parent,
                         
                    //   },
                      callback: function(r) {
                        // var pi = r.message
                        // frappe.db.set_value(cdt, cdn, "gl_payment", pi);
                        //   frm.reload_doc();
                      }
                      
          });
        }   
	
})