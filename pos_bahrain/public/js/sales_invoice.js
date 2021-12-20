frappe.ui.form.on('Sales Invoice', {
  refresh: function (frm) {
    get_employee(frm);
    _create_custom_buttons(frm);
    pos_bahrain.scripts.extensions.hide_sales_return('Return / Credit Note', 'Create');
  },
  customer: function (frm) {
    _set_customer_account_balance(frm);
  },
  validate: function(frm){
    check_duplicate(frm);
  }
});

frappe.ui.form.on('Sales Invoice Item', {
  item_code: function (frm, cdt, cdn) {
    get_total_stock_qty(frm, cdt, cdn)
  },
});

function check_duplicate(frm) {
  if (frm.doc.is_pos && frm.doc.offline_pos_name && frm.doc.is_return && frm.doc.amended_from) {
      frappe.call({
          method: "frappe.client.get_value",
          args: {
              'doctype': 'Sales Invoice',
              'filters': { 'name': frm.doc.amended_from},
              'fieldname': [ 'offline_pos_name' ]
          },
          callback: function(r) {
              if( r.message.offline_pos_name == frm.doc.offline_pos_name){
                  var amended_offline_pos_name = split_str(frm.doc.offline_pos_name);
                  frm.set_value("offline_pos_name", amended_offline_pos_name);
              }
          }
      });
  }
}

function split_str(str_) {
  var amended_str ;
  var split_str = str_.split("-");
  if (split_str.length == 2) {
      amended_str = (str_ + " - 1");
  }
  if (split_str.length == 3) {
      var amend_no = Number(split_str[2]) + 1 ; 
      amended_str = split_str[0] + "-" + split_str[1] + "- " + amend_no ;
  }
  return amended_str;
}

function _create_custom_buttons(frm) {
  if (frm.doc.docstatus !== 1) {
    return;
  }
  frm.add_custom_button(__("Purchase Invoice"), function () {
    _make_purchase_invoice(frm);
  }, __("Create"));
}


function _make_purchase_invoice(frm) {
  frappe.model.open_mapped_doc({
    method: "pos_bahrain.api.sales_invoice.make_purchase_invoice",
    frm,
  });
}


async function _set_customer_account_balance(frm) {
  if(frm.doc.customer != null){
    const account_balance = await _get_customer_account_balance(frm.doc.customer);
    frm.set_value("pb_available_balance", account_balance);
  } 
}


async function _get_customer_account_balance(customer) {
  const { message: data } = await frappe.call({
    method: "pos_bahrain.api.sales_invoice.get_customer_account_balance",
    args: { customer },
  })
  return data;
}

function get_employee(frm) {
  if (!frm.doc.pb_sales_employee && frm.doc.__islocal) {
    frappe.call({
      method: "pos_bahrain.api.sales_invoice.get_logged_employee_id",
      callback: function (r) {
        if (r.message != 0) {
          frm.set_value("pb_sales_employee", r.message)
        }
      }
    })
  }
}

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
