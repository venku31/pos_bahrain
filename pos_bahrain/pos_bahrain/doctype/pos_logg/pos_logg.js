// Copyright (c) 2023, 	9t9it and contributors
// For license information, please see license.txt

frappe.ui.form.on('POS Logg', {
	refresh: function(frm) {
		frm.add_custom_button(__('Go to Sales Invoice'), function(){
            frappe.set_route('List/Sales Invoice/', { offline_pos_name: frm.doc.offline_pos_name })
        });
	}
});
