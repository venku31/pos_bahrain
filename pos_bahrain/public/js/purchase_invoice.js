frappe.ui.form.on('Purchase Invoice Item', {
    item_code: function (frm, cdt, cdn) {
        console.log("test")
        get_total_stock_qty(frm, cdt, cdn)
    },
});

function get_total_stock_qty(frm, cdt, cdn) {
    var d = locals[cdt][cdn];
    if (d.item_code === undefined) {
        return;
    }
    frappe.call({
        method: "pos_bahrain.api.stock.get_total_stock_qty",
        args: {
            item_code: d.item_code
        },
        callback: function (r) {
            frappe.model.set_value(cdt, cdn, "total_available_qty", r.message);
        }
    })
}

frappe.ui.form.on('Purchase Invoice', {
	validate: function(frm) {
	       if(frm.doc.is_paid == 0 && frm.doc.docstatus==0){
        frm.set_value("paid_amount", 0);
        frm.set_value("base_paid_amount", 0);
	}
}
})