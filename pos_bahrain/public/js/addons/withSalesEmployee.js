export default function withBarcodeUom(Pos) {
  return class PosExtended extends Pos {
    async init_master_data(r, freeze) {
      const pos_data = await super.init_master_data(r, freeze);
      const { use_sales_employee, sales_employee_details = [] } = pos_data;
      this.use_sales_employee = !!cint(use_sales_employee);
      this.sales_employee_details = sales_employee_details;
      this._make_sales_employee_field();
      return pos_data;
    }
    make_control() {
      super.make_control();
      this._make_sales_employee_field();
    }
    create_new() {
      super.create_new();
      if (this.sales_employee_field) {
        this.sales_employee_field.$input.val('');
      }
    }
    edit_record() {
      super.edit_record();
      if (this.sales_employee_field) {
        this.sales_employee_field.$input.val(this.frm.doc.pb_sales_employee);
      }
    }
    validate() {
      super.validate();
      if (this.use_sales_employee) {
        this._validate_sales_employee();
      }
    }
    _make_sales_employee_field() {
      if (this.use_sales_employee) {
        const autocomplete_data = this.sales_employee_details.map(
          ({ name, employee_name }) => ({
            label: employee_name,
            value: name,
          })
        );
        if (!this.sales_employee_field) {
          this.sales_employee_field = new frappe.ui.form.ControlAutocomplete({
            parent: $('<div style="margin-left: 1em;" />').appendTo(
              this.page.wrapper.find('.page-title').css('display', 'flex')
            ),
            df: {
              options: autocomplete_data,
              reqd: 1,
              placeholder: __('Sales Employee'),
            },
          });
          this.sales_employee_field.refresh();
          this.sales_employee_field.$input.on('change', () => {
            this.frm.doc.pb_sales_employee = this.sales_employee_field.get_value();
          });
        }
        this.sales_employee_field.set_data(autocomplete_data);
      }
    }
    _validate_sales_employee() {
      const { pb_sales_employee: sales_employee } = this.frm.doc;
      if (
        !sales_employee ||
        !this.sales_employee_details
          .map(({ name }) => name)
          .includes(sales_employee)
      ) {
        frappe.throw(__('A valid Sales Employee is required.'));
      }
    }
  };
}
