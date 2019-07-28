import flowRight from 'lodash/flowRight';

import withUom from './withUom';
import withBatchPrice from './withBatchPrice';
import withBarcodeUom from './withBarcodeUom';
import withCustomerWiseItemPrice from './withCustomerWiseItemPrice';

// the order of the hocs is important. `withUom` should always run before all
// other hocs
export const extend_pos = flowRight([
  withBarcodeUom,
  withBatchPrice,
  withCustomerWiseItemPrice,
  withUom,
]);
