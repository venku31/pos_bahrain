erpnext.pos.PointOfSale = erpnext.pos.PointOfSale.extend({
  onload: function() {
    this._super();
    this.batch_dialog = new frappe.ui.Dialog({
      title: __('Select Batch No'),
      fields: [
        {
          fieldname: 'batch',
          fieldtype: 'Select',
          label: __('Batch No'),
          reqd: 1,
        },
      ],
    });
    this.setinterval_to_sync_master_data(600000);
  },
  init_master_data: async function(r, freeze = true) {
    this._super(r);
    try {
      const {
        message: { batch_no_details, uom_details, exchange_rates } = {},
      } = await frappe.call({
        method: 'pos_bahrain.api.item.get_more_pos_data',
        args: {
          profile: this.pos_profile_data.name,
          company: this.doc.company,
        },
        freeze,
        freeze_message: __('Syncing Item details'),
      });

      if (!batch_no_details || !uom_details || !exchange_rates) {
        throw new Error();
      }
      this.batch_no_data = Object.keys(batch_no_details).reduce(
        (a, x) =>
          Object.assign(a, {
            [x]: batch_no_details[x].map(({ name }) => name),
          }),
        {}
      );
      this.batch_no_details = batch_no_details;
      this.uom_details = uom_details;
      this.exchange_rates = exchange_rates;
      await this.set_opening_entry();
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
  mandatory_batch_no: function() {
    const { has_batch_no, item_code } = this.items[0];
    this.batch_dialog.get_field('batch').$input.empty();
    this.batch_dialog.get_primary_btn().off('click');
    this.batch_dialog.get_close_btn().off('click');
    if (has_batch_no && !this.item_batch_no[item_code]) {
      (this.batch_no_details[item_code] || []).forEach(
        ({ name, expiry_date, qty }) => {
          this.batch_dialog
            .get_field('batch')
            .$input.append(
              $('<option />', { value: name }).text(
                `${name} | ${
                  expiry_date ? frappe.datetime.str_to_user(expiry_date) : '--'
                } | ${qty}`
              )
            );
        }
      );
      this.batch_dialog.get_field('batch').set_input();
      this.batch_dialog.set_primary_action(__('Submit'), () => {
        const batch_no = this.batch_dialog.get_value('batch');
        const item = this.frm.doc.items.find(
          item => item.item_code === item_code
        );
        if (item) {
          item.batch_no = batch_no;
        }
        this.item_batch_no[item_code] = batch_no;
        this.batch_dialog.hide();
        this.set_focus();
      });
      this.batch_dialog.get_close_btn().on('click', () => {
        this.item_code = item_code;
        this.render_selected_item();
        this.remove_selected_item();
        this.wrapper.find('.selected-item').empty();
        this.item_code = null;
        this.set_focus();
      });
      this.batch_dialog.show();
      this.batch_dialog.$wrapper.find('.modal-backdrop').off('click');
    }
  },
  add_new_item_to_grid: function() {
    this._super();
    this.child.uom = this.items[0].stock_uom;
    this.child.conversion_factor = 1;
  },
  render_selected_item: function() {
    this._super();
    $(`
      <div class="pos-list-row">
        <div class="cell">${__('UOM')}:</div>
        <select type="text" class="form-control cell pos-item-uom" />
      </div>
    `).prependTo(this.wrapper.find('.pos-selected-item-action'));
    const $select = this.wrapper.find('.pos-item-uom').off('change');
    const selected_item = this.frm.doc.items.find(
      ({ item_code }) => this.item_code === item_code
    );
    this.uom_details[this.item_code].forEach(({ uom }) => {
      $('<option />', {
        value: uom,
        selected: selected_item && uom === selected_item.uom,
      })
        .text(`${uom}`)
        .appendTo($select);
    });
    $select.on('change', e => {
      e.stopPropagation();
      const { uom, conversion_factor = 1 } = this.uom_details[
        this.item_code
      ].find(({ uom }) => uom === e.target.value);
      if (uom && selected_item) {
        const rate =
          (flt(this.price_list_data[this.item_code]) * flt(conversion_factor)) /
          flt(this.frm.doc.conversion_rate);
        Object.assign(selected_item, {
          uom,
          conversion_factor,
          rate,
          price_list_rate: rate,
          amount: flt(selected_item.qty) * rate,
        });
      }
      this.render_selected_item();
      this.update_paid_amount_status(false);
    });
  },
  set_item_details: function(item_code, field, value, remove_zero_qty_items) {
    // this method is a copy of the original without the negative value validation
    // and return invoice feature added.
    this.remove_item = [];
    (this.frm.doc.items || []).forEach(item => {
      if (item.item_code === item_code) {
        if (item.serial_no && field === 'qty') {
          this.validate_serial_no_qty(item, item_code, field, value);
        }
        if (field === 'qty') {
          item.qty = (this.frm.doc.is_return ? -1 : 1) * Math.abs(value);
        } else {
          item[field] = flt(value);
        }
        item.amount = flt(item.rate) * flt(item.qty);
        if (item.qty === 0 && remove_zero_qty_items) {
          this.remove_item.push(item.idx);
        }
        if (field === 'discount_percentage' && value === 0) {
          item.rate = item.price_list_rate;
        }
        if (field === 'rate') {
          const discount_percentage =
            (1.0 - flt(value) / flt(item.price_list_rate)) * 100.0;
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
          el.innerText = flt(value, precision('discount_percentage'));
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
  add_to_cart: function() {
    // this method is a copy of the original with the return invoice feature added.
    this.customer_validate();
    this.mandatory_batch_no();
    this.validate_serial_no();
    this.validate_warehouse();
    let caught = false;
    if (this.wrapper.find('.pos-bill-item').length > 0) {
      (this.frm.doc['items'] || []).forEach(item => {
        if (item.item_code === this.items[0].item_code) {
          caught = true;
          item.qty += this.frm.doc.is_return ? -1 : 1;
          item.amount = flt(item.rate) * flt(item.qty);
          if (this.item_serial_no[item.item_code]) {
            item.serial_no += '\n' + this.item_serial_no[item.item_code][0];
            item.warehouse = this.item_serial_no[item.item_code][1];
          }
          if (this.item_batch_no.length) {
            item.batch_no = this.item_batch_no[item.item_code];
          }
        }
      });
    }
    if (!caught) {
      this.add_new_item_to_grid();
    }
    this.update_paid_amount_status(false);
    this.wrapper.find('.item-cart-items').scrollTop(1000);
  },
  make_control: function() {
    this._super();
    this.make_return_control();
    this.bind_keyboard_shortcuts();
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
  bind_keyboard_shortcuts: function() {
    $(document).on('keydown', e => {
      if (frappe.get_route_str() === 'pos') {
        if (this.numeric_keypad && e.keyCode === 120) {
          e.preventDefault();
          e.stopPropagation();
          if (this.dialog && this.dialog.is_visible) {
            this.dialog.hide();
          } else {
            $(this.numeric_keypad)
              .find('.pos-pay')
              .trigger('click');
          }
        } else if (
          this.frm.doc.docstatus == 1 &&
          e.ctrlKey &&
          e.keyCode === 80
        ) {
          e.preventDefault();
          e.stopPropagation();
          if (this.msgprint) {
            this.msgprint.msg_area.find('.print_doc').click();
          } else {
            this.page.btn_secondary.trigger('click');
          }
        } else if (e.ctrlKey && e.keyCode === 66) {
          e.preventDefault();
          e.stopPropagation();
          if (this.msgprint) {
            console.log('new_doc');
            this.msgprint.msg_area.find('.new_doc').click();
          } else {
            this.page.btn_primary.trigger('click');
          }
        }
      }
    });
  },
  get_exchange_rate: function(mop) {
    const { mode_of_payment } =
      this.frm.doc.payments.find(({ idx, mode_of_payment }) =>
        mop ? mop === mode_of_payment : cint(idx) === cint(this.idx)
      ) || {};
    return (
      this.exchange_rates[mode_of_payment] || {
        conversion_rate: this.frm.doc.conversion_rate || 1,
        currency: this.frm.doc.currency,
      }
    );
  },
  make_payment: function() {
    if (this.dialog) {
      this.dialog.$wrapper.remove();
    }
    this._super();
    this.dialog.$body
      .find('.write_off_amount')
      .parent()
      .addClass('hidden');
  },
  show_payment_details: function() {
    const multimode_payments = $(this.$body).find('.multimode-payments').html(`
      <ul class="nav nav-tabs" role="tablist">
        <li role="presentation" class="active">
          <a role="tab" data-toggle="tab" data-target="#multimode_loc">${__(
            'Base'
          )}</a>
        </li>
        <li role="presentation">
          <a role="tab" data-toggle="tab" data-target="#multimode_alt">${__(
            'Alternate'
          )}</a>
        </li>
      </ul>
      <div class="tab-content">
        <div role="tabpanel" class="tab-pane active" id="multimode_loc" />
        <div role="tabpanel" class="tab-pane" id="multimode_alt" />
      </div>
    `);
    const multimode_loc = multimode_payments.find('#multimode_loc');
    const multimode_alt = multimode_payments.find('#multimode_alt');
    if (this.frm.doc.payments.length) {
      this.frm.doc.payments.forEach(
        ({ mode_of_payment, amount, idx, type }) => {
          const { currency, conversion_rate } = this.get_exchange_rate(
            mode_of_payment
          );
          const in_alt_currency = Object.keys(this.exchange_rates).includes(
            mode_of_payment
          );
          const $payment = $(
            frappe.render_template('payment_details', {
              mode_of_payment,
              amount,
              idx,
              currency,
              type,
            })
          ).appendTo(in_alt_currency ? multimode_alt : multimode_loc);
          if (in_alt_currency) {
            $payment.find('div.col-xs-6:first-of-type').css({
              padding: '0 15px',
              display: 'flex',
              'flex-flow': 'column nowrap',
              height: '100%',
              'justify-content': 'center',
            }).html(`
              <div>${mode_of_payment}</div>
              <div style="font-size: 0.75em; color: #888;">
                CR: ${flt(conversion_rate, precision()).toFixed(3)}
                /
                <span class="local-currency-amount">${format_currency(
                  amount * flt(conversion_rate, precision()),
                  this.frm.doc.currency
                )}</span>
              </div>
            `);
          }
          if (type === 'Cash' && amount === this.frm.doc.paid_amount) {
            this.idx = idx;
            this.selected_mode = $(this.$body).find(`input[idx='${this.idx}']`);
            this.highlight_selected_row();
            this.bind_amount_change_event();
          }
        }
      );
    } else {
      $('<p>No payment mode selected in pos profile</p>').appendTo(
        multimode_payments
      );
    }
  },
  set_outstanding_amount: function() {
    this.selected_mode = $(this.$body).find(`input[idx='${this.idx}']`);
    this.highlight_selected_row();
    this.payment_val = 0.0;
    const { conversion_rate, currency } = this.get_exchange_rate();
    if (
      this.frm.doc.outstanding_amount > 0 &&
      flt(this.selected_mode.val()) === 0.0
    ) {
      this.payment_val = flt(this.frm.doc.outstanding_amount / conversion_rate);
      this.selected_mode.val(format_currency(this.payment_val, currency));
      this.update_payment_amount();
    } else if (flt(this.selected_mode.val()) > 0) {
      this.payment_val = flt(this.selected_mode.val());
    }
    this.selected_mode.select();
    this.bind_amount_change_event();
  },
  bind_amount_change_event: function() {
    this.selected_mode.off('change');
    this.selected_mode.on('change', e => {
      this.payment_val = flt(e.target.value) || 0.0;
      this.idx = this.selected_mode.attr('idx');
      const { currency } = this.get_exchange_rate();
      this.selected_mode.val(format_currency(this.payment_val, currency));
      this.update_payment_amount();
    });
  },
  update_payment_amount: function() {
    const selected_payment = this.frm.doc.payments.find(
      ({ idx }) => cint(idx) === cint(this.idx)
    );
    if (selected_payment) {
      const {
        conversion_rate: mop_conversion_rate,
        currency: mop_currency,
      } = this.get_exchange_rate();
      const mop_amount = flt(this.selected_mode.val());
      const amount = mop_amount * flt(mop_conversion_rate);
      Object.assign(selected_payment, {
        amount,
        mop_currency,
        mop_conversion_rate,
        mop_amount,
      });
      $(this.$body)
        .find('.selected-payment-mode .local-currency-amount')
        .text(format_currency(amount, this.frm.doc.currency));
    }
    this.calculate_outstanding_amount(false);
    this.show_amounts();
  },
  refresh: function() {
    this._super();
    if (!this.pos_voucher) {
      this.set_opening_entry();
    }
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
