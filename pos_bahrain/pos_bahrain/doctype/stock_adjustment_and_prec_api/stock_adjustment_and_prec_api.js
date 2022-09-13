// Copyright (c) 2022, 	9t9it and contributors
// For license information, please see license.txt

frappe.ui.form.on('Stock Adjustment And PREC API', {
	refresh: function(frm) {
		cur_frm.disable_save();
		// cur_frm.set_value("price","");
		cur_frm.fields_dict.check.$input.on("click", function(evt){
			setTimeout(clear_fields(), 5000)
		})
	},
	item : function(frm, cdt, cdn){
		fetch_batch_entry(frm, cdt, cdn);
		// check_stock(frm, cdt, cdn);
		
	},
	// update : function(frm){
	// 	create_stock_adjustment(frm);
	// 	// check_stock(frm, cdt, cdn);
		
	// },
});
function clear_fields(){
	console.log("Clear field ::::::::::::::::::::::s")
}

function fetch_batch_entry(frm, cdt, cdn) {
	console.log("1")
	frappe.call({
	  "method": "pos_bahrain.api.stock_entry.search_batch_details",
	  "args": {
		"batch": frm.doc.item,
	   },
	  callback: function (r) {
		console.log(r)
		// cur_frm.clear_table("details");
		r.message.forEach(stock => {
		  var child = cur_frm.add_child("details");
		  cur_frm.set_value("item","")
		  frappe.model.set_value(child.doctype, child.name, "batch_no", stock.batch_no)
		  frappe.model.set_value(child.doctype, child.name, "item_code", stock.item_code)
		  frappe.model.set_value(child.doctype, child.name, "warehouse", stock.warehouse)
		  frappe.model.set_value(child.doctype, child.name, "qty", stock.qty)
		  frappe.model.set_value(child.doctype, child.name, "stock_uom", stock.stock_uom)
		//   frappe.model.set_value(child.doctype, child.name, "item_name", stock.item_name)
		  });
	    cur_frm.refresh_fields()
			
	  }
	  
	});
	cur_frm.fields_dict.my_field.$input.on("click", function(evt){

	})
};

function create_stock_adjustment(frm) {
	console.log("1")
	frappe.call({
	  "method": "pos_bahrain.api.stock_entry.create_stock_adjust",
	  "args": {
		// "batch": frm.doc.item,
	   },
	  callback: function (r) {
		console.log(r)
		// cur_frm.clear_table("details");
		// r.message.forEach(stock => {
		//   var child = cur_frm.add_child("details");
		//   cur_frm.set_value("item","")
		//   frappe.model.set_value(child.doctype, child.name, "batch_no", stock.batch_no)
		//   frappe.model.set_value(child.doctype, child.name, "item_code", stock.item_code)
		//   frappe.model.set_value(child.doctype, child.name, "warehouse", stock.warehouse)
		//   frappe.model.set_value(child.doctype, child.name, "qty", stock.qty)
		//   frappe.model.set_value(child.doctype, child.name, "stock_uom", stock.stock_uom)
		// //   frappe.model.set_value(child.doctype, child.name, "item_name", stock.item_name)
		//   });
	    // cur_frm.refresh_fields()
			
	  }
	  
	});
	// cur_frm.fields_dict.my_field.$input.on("click", function(evt){

	// })
};
// frappe.ui.form.on("Stock Entry Api Details", "check", function(frm, cdt, cdn) {
// 	var d = locals[cdt][cdn];
// 	// if (d.check) {
// 			   frappe.call({
// 				method:"pos_bahrain.api.stock_entry.create_stock_adjust",
// 				args: { 
// 					batch_no: d.batch_no,
// 					item_code:d.item_code,
// 					warehouse:d.warehouse,
// 					qty:d.update_qty,
// 					stock_uom:d.stock_uom,
// 				},
// 				callback: function(r) {
// 				  var pi = r.message
// 				  alert("Stock Recociliation Created",r);
// 					// frm.reload_doc();
// 				}
				
// 	});
// //   } 

// })
frappe.ui.form.on("Stock Adjustment And PREC API", "update", function(frm, cdt, cdn) {
    $.each(frm.doc.details || [], function(i, d) {
        if(d.check){
        frappe.call({
                method: "pos_bahrain.api.stock_entry.create_stock_adjust",
                args: { 
					batch_no: d.batch_no,
					item_code:d.item_code,
					warehouse:d.warehouse,
					qty:d.update_qty,
					stock_uom:d.stock_uom,
				},
                callback: function(r) {
					var pi = r.message
					alert("Stock Recociliation Created",r);
                }
            });	
        }
    
     })
      refresh_field("items");
    })