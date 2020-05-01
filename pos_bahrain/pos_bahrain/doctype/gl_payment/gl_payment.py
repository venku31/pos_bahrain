# -*- coding: utf-8 -*-
# pylint: disable=no-member
# Copyright (c) 2020, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from erpnext.controllers.accounts_controller import AccountsController
from erpnext.accounts.doctype.sales_invoice.sales_invoice import get_bank_cash_account
from erpnext.accounts.general_ledger import make_gl_entries
from toolz import compose, concat


class GLPayment(AccountsController):
    def validate(self):
        pass

    def on_submit(self):
        self._make_gl_entries()

    def on_cancel(self):
        self._make_gl_entries(cancel=1)

    def _make_gl_entries(self, cancel=0):
        gl_entries = [
            self.get_gl_dict(x)
            for x in self._get_payment_gl_entries() + self._get_account_gl_entries()
        ]
        make_gl_entries(gl_entries, cancel=cancel)

    def _get_payment_gl_entries(self):
        payment_account = get_bank_cash_account(self.mode_of_payment, self.company)[
            "account"
        ]
        credit_or_debit = _get_direction(self.payment_type)
        return [
            {
                "account": payment_account,
                credit_or_debit: self.total_amount,
                "against": self.party,
            }
        ]

    def _get_account_gl_entries(self):
        credit_or_debit = _get_direction(self.payment_type, reverse=True)
        list_concat = compose(list, concat)
        return list_concat(
            [
                [
                    {
                        "account": x.account,
                        credit_or_debit: x.net_amount,
                        "against": self.party,
                        "cost_center": self.cost_center,
                        "remarks": x.remarks,
                    },
                    {
                        "account": x.account_head,
                        credit_or_debit: x.tax_amount,
                        "against": self.party,
                    },
                ]
                for x in self.items
            ]
        )


def _get_direction(payment_type, reverse=False):
    if payment_type == "Incoming":
        return "debit" if not reverse else "credit"
    if payment_type == "Outgoing":
        return "credit" if not reverse else "debit"
    frappe.throw(frappe._("Invalid Payment Type"))
