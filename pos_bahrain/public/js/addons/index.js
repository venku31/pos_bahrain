import flowRight from 'lodash/flowRight';

import withUom from './withUom';
import withBatchPrice from './withBatchPrice';
import withBarcodeUom from './withBarcodeUom';
import withCustomerWiseItemPrice from './withCustomerWiseItemPrice';
import withStockValidator from './withStockValidator';
import withBatchField from './withBatchField';
import withIdx from './withIdx';

// the order of the hocs is important. `withUom` should always run before all
// other hocs
export const extend_pos = flowRight([
  withIdx,
  withBarcodeUom,
  withBatchPrice,
  withCustomerWiseItemPrice,
  withStockValidator,
  withBatchField,
  withUom,
]);
