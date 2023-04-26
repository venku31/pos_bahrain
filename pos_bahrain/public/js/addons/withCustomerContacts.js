export default function withCustomerContacts(Pos) {
    return class PosExtended extends Pos {
      async init_master_data(r, freeze) {
        const pos_data = await super.init_master_data(r, freeze);
        const { customer_contacts } = pos_data;
        this.customer_contacts = customer_contacts;
        return pos_data;
      }
      make_customer() {
        super.make_customer();
        const me = this;
        me.party_field.$input.on('awesomplete-select', function (e) {
          console.log(e.originalEvent.text.value);

          //Fetch address line 1 and 2
          frappe.call({
            method: "pos_bahrain.api.get_customer_details.get_customer_address",
            args: {
              customer_name: e.originalEvent.text.value
            },
            callback: (r) => {
              localStorage.setItem("address_line1", r.message.address_line1);
              localStorage.setItem("address_line2", r.message.address_line2);
            }
          });

          //Fetch contact
          frappe.call({
            method: "pos_bahrain.api.get_customer_details.get_customer_contact",
            args: {
              customer_name: e.originalEvent.text.value
            },
            callback: (r) => {
              localStorage.setItem("contact", r.message.contact);
            }
          });

          //Fetch customer name
          frappe.call({
            method: "pos_bahrain.api.get_customer_details.get_customer_full_name",
            args: {
              customer_name: e.originalEvent.text.value
            },
            callback: (r) => {
              localStorage.setItem("customer_name", r.message.customer_name);
            }
          });

          const customer = e.originalEvent.text.value;
          me.frm.doc.phone = me.customer_contacts[customer] || '';
        });
      }
    };
  }