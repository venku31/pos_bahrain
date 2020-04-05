function set_item_code(doc, cdt, cdn) {
  var d = frappe.model.get_doc(cdt, cdn);
  if (d.barcode) {
    frappe.call({
      method: 'erpnext.stock.get_item_details.get_item_code',
      args: { barcode: d.barcode },
      callback: function (r) {
        if (!r.exe) {
          frappe.model.set_value(cdt, cdn, 'item_code', r.message);
        }
      },
    });
  }
}

function set_valuation_rate_and_qty(frm, cdt, cdn) {
  var d = frappe.model.get_doc(cdt, cdn);

  if (d.item_code && d.warehouse) {
    frappe.call({
      method:
        'pos_bahrain.pos_bahrain.doctype.backported_stock_reconciliation.backported_stock_reconciliation.get_stock_balance_for',
      args: {
        item_code: d.item_code,
        warehouse: d.warehouse,
        posting_date: frm.doc.posting_date,
        posting_time: frm.doc.posting_time,
        batch_no: d.batch_no,
      },
      callback: function (r) {
        frappe.model.set_value(cdt, cdn, 'qty', r.message.qty);
        frappe.model.set_value(cdt, cdn, 'valuation_rate', r.message.rate);
        frappe.model.set_value(cdt, cdn, 'current_qty', r.message.qty);
        frappe.model.set_value(
          cdt,
          cdn,
          'current_valuation_rate',
          r.message.rate
        );
        frappe.model.set_value(
          cdt,
          cdn,
          'current_amount',
          r.message.rate * r.message.qty
        );
        frappe.model.set_value(
          cdt,
          cdn,
          'amount',
          r.message.rate * r.message.qty
        );
        frappe.model.set_value(
          cdt,
          cdn,
          'current_serial_no',
          r.message.serial_nos
        );
      },
    });
  }
}

function set_amount_quantity(doc, cdt, cdn) {
  var d = frappe.model.get_doc(cdt, cdn);
  if (d.qty & d.valuation_rate) {
    frappe.model.set_value(
      cdt,
      cdn,
      'amount',
      flt(d.qty) * flt(d.valuation_rate)
    );
    frappe.model.set_value(
      cdt,
      cdn,
      'quantity_difference',
      flt(d.qty) - flt(d.current_qty)
    );
    frappe.model.set_value(
      cdt,
      cdn,
      'amount_difference',
      flt(d.amount) - flt(d.current_amount)
    );
  }
}

const backported_stock_reconciliation_item = {
  barcode: set_item_code,
  warehouse: function (frm, cdt, cdn) {
    var child = locals[cdt][cdn];
    if (child.batch_no) {
      frappe.model.set_value(child.cdt, child.cdn, 'batch_no', '');
    }
    set_valuation_rate_and_qty(frm, cdt, cdn);
  },
  item_code: function (frm, cdt, cdn) {
    var child = locals[cdt][cdn];
    if (child.batch_no) {
      frappe.model.set_value(cdt, cdn, 'batch_no', '');
    }
    set_valuation_rate_and_qty(frm, cdt, cdn);
  },
  batch_no: set_valuation_rate_and_qty,
  qty: set_amount_quantity,
  valuation_rate: set_amount_quantity,
  serial_no: function (frm, cdt, cdn) {
    var child = locals[cdt][cdn];
    if (child.serial_no) {
      const serial_nos = child.serial_no.trim().split('\n');
      frappe.model.set_value(cdt, cdn, 'qty', serial_nos.length);
    }
  },
};

export default {
  backported_stock_reconciliation_item,
  onload: function (frm) {
    frm.add_fetch('item_code', 'item_name', 'item_name');

    // end of life
    frm.set_query('item_code', 'items', function (doc, cdt, cdn) {
      return {
        query: 'erpnext.controllers.queries.item_query',
        filters: {
          is_stock_item: 1,
        },
      };
    });
    frm.set_query('batch_no', 'items', function (frm, cdt, cdn) {
      const { item_code: item } = frappe.get_doc(cdt, cdn);
      return { filters: { item } };
    });

    if (frm.doc.company) {
      erpnext.queries.setup_queries(frm, 'Warehouse', function () {
        return erpnext.queries.warehouse(frm.doc);
      });
    }

    if (!frm.doc.expense_account) {
      frm.trigger('set_expense_account');
    }
  },
  refresh: function (frm) {
    if (frm.doc.company) {
      frm.trigger('toggle_display_account_head');
    }
  },
  company: function (frm) {
    frm.trigger('toggle_display_account_head');
  },
  toggle_display_account_head: function (frm) {
    frm.toggle_display(
      ['expense_account', 'cost_center'],
      erpnext.is_perpetual_inventory_enabled(frm.doc.company)
    );
  },
  purpose: function (frm) {
    frm.trigger('set_expense_account');
  },
  set_expense_account: function (frm) {
    if (
      frm.doc.company &&
      erpnext.is_perpetual_inventory_enabled(frm.doc.company)
    ) {
      return frm.call({
        method:
          'erpnext.stock.doctype.stock_reconciliation.stock_reconciliation.get_difference_account',
        args: {
          purpose: frm.doc.purpose,
          company: frm.doc.company,
        },
        callback: function (r) {
          if (!r.exc) {
            frm.set_value('expense_account', r.message);
          }
        },
      });
    }
  },
};
