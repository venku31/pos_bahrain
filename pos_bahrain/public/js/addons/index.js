import flowRight from 'lodash/flowRight';

import { default as withBatchPrice } from './withBatchPrice';
import { default as withBarcodeUom } from './withBarcodeUom';

const extend_pos = flowRight([withBarcodeUom, withBatchPrice]);

export { withBatchPrice, withBarcodeUom, extend_pos };
