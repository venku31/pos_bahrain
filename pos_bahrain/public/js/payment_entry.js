frappe.ui.form.on('Payment Entry Reference', {
    reference_name: async function(frm, cdt, cdn) {
        const child = locals[cdt][cdn];
        if (child.reference_doctype === "Sales Invoice") {
            const { message: invoice } = await frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Sales Invoice",
                    fieldname: "posting_date",
                    filters: {'name': child.reference_name}
                }
            });
            frappe.model.set_value(child.doctype, child.name, 'pb_invoice_date', invoice.posting_date);
        }
    }
});
