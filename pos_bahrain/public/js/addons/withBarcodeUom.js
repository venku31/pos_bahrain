export default function withBarcodeUom(Pos) {
  return class PosExtended extends Pos {
    async init_master_data(r, freeze) {
      const pos_data = await super.init_master_data(r, freeze);
      const { use_barcode_uom, barcode_details } = pos_data;
      this.use_barcode_uom = !!cint(use_barcode_uom);
      this.barcode_details = barcode_details;
      return pos_data;
    }
  };
}
