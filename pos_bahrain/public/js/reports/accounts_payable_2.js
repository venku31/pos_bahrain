import { load_filters_on_load } from './accounts_receivable_2';

export default function () {
  return {
    onload: load_filters_on_load('Accounts Payable'),
    filters: [],
  };
}
