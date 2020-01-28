# Copyright (c) 2013, 	9t9it and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
from erpnext.accounts.report.accounts_receivable.accounts_receivable import (
    execute as accounts_receivable,
)


def execute(filters=None):
    return accounts_receivable(filters)
