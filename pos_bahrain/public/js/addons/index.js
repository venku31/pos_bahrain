import flowRight from 'lodash/flowRight';

import { default as withUom } from './withUom';
import { default as withBatchPrice } from './withBatchPrice';
import { default as withBarcodeUom } from './withBarcodeUom';

// the order of the hocs is important. `withUom` should always run before all
// other hocs
const extend_pos = flowRight([withBatchPrice, withBarcodeUom, withUom]);

export { withUom, withBatchPrice, withBarcodeUom, extend_pos };
