export default async function(frm) {
  const scan_fieldname = ['Purchase Receipt'].includes(frm.doc.doctype)
    ? 'pb_scan_barcode'
    : 'scan_barcode';
  function set_description(msg) {
    frm.fields_dict[scan_fieldname].set_new_description(__(msg));
  }

  const search_value = frm.doc[scan_fieldname];
  const { items } = frm.doc;

  if (search_value) {
    const { message: data } = await frappe.call({
      method:
        'erpnext.selling.page.point_of_sale.point_of_sale.search_serial_or_batch_or_barcode_number',
      args: { search_value },
    });
    if (!data || Object.keys(data).length === 0) {
      set_description('Cannot find Item with this barcode');
      return;
    }
    const row =
      items.find(({ item_code, batch_no }) => {
        if (batch_no) {
          return item_code == data.item_code && batch_no == data.batch_no;
        }
        return item_code === data.item_code;
      }) ||
      items.find(({ item_code }) => !item_code) ||
      frappe.model.add_child(
        frm.doc,
        frm.fields_dict['items'].grid.doctype,
        'items'
      );

    if (row.item_code) {
      set_description(`Row #${row.idx}: Qty increased by 1`);
    } else {
      set_description(`Row #${row.idx}:Item added`);
    }

    frm.from_barcode = true;

    const { qty = 0 } = row;
    await frappe.model.set_value(
      row.doctype,
      row.name,
      Object.assign(
        data,
        {
          qty: cint(frm.doc.is_return) ? qty - 1 : qty + 1,
        },
        frm.doc.doctype === 'Stock Entry' && {
          s_warehouse: frm.doc.from_warehouse,
          t_warehouse: frm.doc.to_warehouse,
        }
      )
    );

    frm.fields_dict['scan_barcode'].set_value('');
    frm.fields_dict[scan_fieldname].set_value('');
  }
  return false;
}
