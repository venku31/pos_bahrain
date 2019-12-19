erpnext.pos.PointOfSale = erpnext.pos.PointOfSale.extend({
  onload: function() {
    this._super();
    this.setinterval_to_sync_master_data(600000);
    this.precision =
      frappe.defaults.get_default('currency_precision') ||
      frappe.defaults.get_default('float_precision');
  },
  init_master_data: async function(r, freeze = true) {
    this._super(r);
    try {
      const { message: pos_data = {} } = await frappe.call({
        method: 'pos_bahrain.api.item.get_more_pos_data',
        args: {
          profile: this.pos_profile_data.name,
          company: this.doc.company,
        },
        freeze,
        freeze_message: __('Syncing Item details'),
      });

      await this.set_opening_entry();
      return pos_data;
    } catch (e) {
      frappe.msgprint({
        indicator: 'orange',
        title: __('Warning'),
        message: __(
          'Unable to load extended Item details. Usage will be restricted.'
        ),
      });
    }
  },
  create_new: function() {
    this._super();
    this.wrapper
      .find('.pos-bill-wrapper .return-row #is_return_check')
      .prop('checked', false);
  },
  setinterval_to_sync_master_data: function(delay) {
    setInterval(async () => {
      const { message } = await frappe.call({ method: 'frappe.handler.ping' });
      if (message) {
        const r = await frappe.call({
          method: 'erpnext.accounts.doctype.sales_invoice.pos.get_pos_data',
        });
        localStorage.setItem('doc', JSON.stringify(r.message.doc));
        this.init_master_data(r, false);
        this.load_data(false);
        this.make_item_list();
        this.set_missing_values();
      }
    }, delay);
  },
  set_opening_entry: async function() {
    const { message: pos_voucher } = await frappe.call({
      method: 'pos_bahrain.api.pos_voucher.get_unclosed',
      args: {
        user: frappe.session.user,
        pos_profile: this.pos_profile_data.name,
        company: this.doc.company,
      },
    });
    if (pos_voucher) {
      this.pos_voucher = pos_voucher;
    } else {
      const dialog = new frappe.ui.Dialog({
        title: __('Enter Opening Cash'),
        fields: [
          {
            fieldtype: 'Datetime',
            fieldname: 'period_from',
            label: __('Start Date Time'),
            default: frappe.datetime.now_datetime(),
          },
          {
            fieldtype: 'Currency',
            fieldname: 'opening_amount',
            label: __('Amount'),
          },
        ],
      });
      dialog.show();
      dialog.get_close_btn().hide();
      dialog.set_primary_action('Enter', async () => {
        try {
          const { message: voucher_name } = await frappe.call({
            method: 'pos_bahrain.api.pos_voucher.create_opening',
            args: {
              posting: dialog.get_value('period_from'),
              opening_amount: dialog.get_value('opening_amount'),
              company: this.doc.company,
              pos_profile: this.pos_profile_data.name,
            },
          });
          if (!voucher_name) {
            throw Exception;
          }
          this.pos_voucher = voucher_name;
        } catch (e) {
          frappe.msgprint({
            message: __('Unable to create POS Closing Voucher opening entry.'),
            title: __('Warning'),
            indicator: 'orange',
          });
        } finally {
          dialog.hide();
          dialog.$wrapper.remove();
        }
      });
    }
  },
  set_item_details: function(item_code, field, value, remove_zero_qty_items) {
    // this method is a copy of the original without the negative value validation
    // and return invoice feature added.
    const idx = this.wrapper.find('.pos-bill-item.active').data('idx');

    this.remove_item = [];

    (this.frm.doc.items || []).forEach((item, id) => {
      if (item.item_code === item_code && id === idx) {
        if (item.serial_no && field === 'qty') {
          this.validate_serial_no_qty(item, item_code, field, value);
        }
        if (field === 'qty') {
          item.qty = (this.frm.doc.is_return ? -1 : 1) * Math.abs(value);
        } else {
          item[field] = flt(value, this.precision);
        }
        item.amount = flt(item.rate * item.qty, this.precision);
        if (item.qty === 0 && remove_zero_qty_items) {
          this.remove_item.push(item.idx);
        }
        if (field === 'discount_percentage' && value === 0) {
          item.rate = item.price_list_rate;
        }
        if (field === 'rate') {
          const discount_percentage = flt(
            (1.0 - value / item.price_list_rate) * 100.0,
            this.precision
          );
          if (discount_percentage > 0) {
            item.discount_percentage = discount_percentage;
          }
        }
      }
    });
    if (field === 'qty') {
      this.remove_zero_qty_items_from_cart();
    }
    this.update_paid_amount_status(false);
  },
  show_items_in_item_cart: function() {
    this._super();
    this.wrapper
      .find('.items')
      .find('.pos-bill-item > .cell:nth-child(3)')
      .each((i, el) => {
        const value = el.innerText;
        if (value !== '0') {
          el.innerText = flt(value, this.precision);
        }
      });
  },
  make_menu_list: function() {
    this._super();
    this.page.menu
      .find('a.grey-link:contains("Cashier Closing")')
      .parent()
      .hide();
    this.page.add_menu_item('POS Closing Voucher', async () => {
      if (this.connection_status) {
        if (!this.pos_voucher) {
          await this.set_opening_entry();
        }
        frappe.dom.freeze('Syncing');
        this.sync_sales_invoice();
        await frappe.after_server_call();
        frappe.set_route('Form', 'POS Closing Voucher', this.pos_voucher, {
          period_to: frappe.datetime.now_datetime(),
        });
        frappe.dom.unfreeze();
        this.pos_voucher = null;
      } else {
        frappe.msgprint({
          message: __('Please perform this when online.'),
        });
      }
    });
  },
  refresh_fields: function(update_paid_amount) {
    this.apply_pricing_rule();
    this.discount_amount_applied = false;
    this._calculate_taxes_and_totals();
    this.calculate_discount_amount();
    this.show_items_in_item_cart();
    this.set_taxes();
    this.calculate_outstanding_amount(update_paid_amount);
    this.set_totals();
    this.update_total_qty();
  },
  update_total_qty: function() {
    var me = this;
    var qty_total = 0;
    $.each(this.frm.doc['items'] || [], function(i, d) {
      if (d.item_code) {
        qty_total += d.qty;
      }
    });
    this.frm.doc.qty_total = qty_total;
    this.wrapper.find('.qty-total').text(this.frm.doc.qty_total);
  },
  create_invoice: function() {
    var me = this;
    var invoice_data = {};
    function get_barcode_uri(text) {
      return JsBarcode(document.createElement('canvas'), text, {
        height: 40,
        displayValue: false,
      })._renderProperties.element.toDataURL();
    }
    this.si_docs = this.get_doc_from_localstorage();
    if (this.frm.doc.offline_pos_name) {
      this.update_invoice();
    } else {
      this.frm.doc.offline_pos_name = $.now();
      this.frm.doc.pos_name_barcode_uri = get_barcode_uri(
        this.frm.doc.offline_pos_name
      );
      this.frm.doc.posting_date = frappe.datetime.get_today();
      this.frm.doc.posting_time = frappe.datetime.now_time();
      this.frm.doc.pos_total_qty = this.frm.doc.qty_total;
      this.frm.doc.pos_profile = this.pos_profile_data['name'];
      invoice_data[this.frm.doc.offline_pos_name] = this.frm.doc;
      this.si_docs.push(invoice_data);
      this.update_localstorage();
      this.set_primary_action();
    }
    return invoice_data;
  },
  make_control: function() {
    this._super();
    this.make_return_control();
  },
  make_return_control: function() {
    this.numeric_keypad
      .parent()
      .css('margin-top', 0)
      .before(
        `
        <div class="return-row form-check text-right" style="margin-top: 30px">
          <input class="form-check-input" type="checkbox" id="is_return_check">
          <label class="form-check-label" for="is_return_check">${__(
            'Is Return'
          )}</label>
        </div>
        `
      );
    this.wrapper
      .find('.pos-bill-wrapper .return-row #is_return_check')
      .on('change', e => {
        this.frm.doc.is_return = e.target.checked ? 1 : 0;
        (this.frm.doc.items || []).forEach(item => {
          item.qty = (this.frm.doc.is_return ? -1 : 1) * Math.abs(item.qty);
        });
        this.update_paid_amount_status(false);
      });
  },
  refresh: function() {
    this._super();
    if (!this.pos_voucher) {
      this.set_opening_entry();
    }
  },

  set_payment_primary_action: function() {
    this.dialog.set_primary_action(
      __('Submit'),
      this.payment_primary_action.bind(this)
    );
  },
  payment_primary_action: function() {
    // callback for the 'Submit' button in the payment modal. copied from upstream.
    // implemented as a class method to make the callback extendable from
    // subsequent hocs

    // Allow no ZERO payment
    $.each(this.frm.doc.payments, (index, data) => {
      if (data.amount != 0) {
        this.dialog.hide();
        this.submit_invoice();
        return;
      }
    });
  },

  calculate_outstanding_amount: function(update_paid_amount) {
    // over-simplified approach. doesn't consider alternate currencies or decimal
    // rounding. this needed because, as it is, set_default_payment will never be
    // called for is_return invoices.
    if (this.frm.doc.is_return) {
      (this.frm.doc.payments || []).every(payment => {
        if (payment.default) {
          payment.base_amount = this.frm.doc.grand_total;
          payment.amount = this.frm.doc.grand_total;
          return false;
        }
        return true;
      });
    }
    this._super(update_paid_amount);
  },
});

erpnext.pos.PointOfSale = pos_bahrain.addons.extend_pos(
  erpnext.pos.PointOfSale
);
