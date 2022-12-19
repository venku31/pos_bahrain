
frappe.provide("erpnext.public");
frappe.provide("erpnext.controllers");

erpnext.taxes_and_totals.prototype.update_paid_amount_for_return = function() {
// update_paid_amount_for_return: function() {
    var grand_total = this.frm.doc.rounded_total || this.frm.doc.grand_total;

    if(this.frm.doc.party_account_currency == this.frm.doc.currency) {
        var total_amount_to_pay = flt((grand_total - this.frm.doc.total_advance
            - this.frm.doc.write_off_amount), precision("grand_total"));
    } else {
        var total_amount_to_pay = flt(
            (flt(grand_total*this.frm.doc.conversion_rate, precision("grand_total"))
                - this.frm.doc.total_advance - this.frm.doc.base_write_off_amount),
            precision("base_grand_total")
        );
    }

    let existing_amount = 0
    $.each(this.frm.doc.payments || [], function(i, row) {
        existing_amount += row.amount;
    })

    // if (existing_amount != total_amount_to_pay) {
    //     frappe.db.get_value('Sales Invoice Payment', {'parent': this.frm.doc.pos_profile, 'default': 1},
    //         ['mode_of_payment', 'account', 'type'], (value) => {
    //             if (this.frm.is_dirty()) {
    //                 frappe.model.clear_table(this.frm.doc, 'payments');
    //                 if (value) {
    //                     let row = frappe.model.add_child(this.frm.doc, 'Sales Invoice Payment', 'payments');
    //                     row.mode_of_payment = value.mode_of_payment;
    //                     row.type = value.type;
    //                     row.account = value.account;
    //                     row.default = 1;
    //                     row.amount = total_amount_to_pay;
    //                 } else {
    //                     this.frm.set_value('is_pos', 1);
    //                 }
    //                 this.frm.refresh_fields();
    //                 this.calculate_paid_amount();
    //             }
    //         }, 'Sales Invoice');
    // } else {
    //     this.calculate_paid_amount();
    // }
}