# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.utils import today
from frappe.desk.reportview import get_filters_cond
from functools import partial
from toolz import groupby, merge, valmap, compose, get, excepts, first, pluck

from pos_bahrain.utils import key_by


@frappe.whitelist()
def get_pos_data():
    from erpnext.accounts.doctype.sales_invoice.pos import get_pos_data

    get_price = compose(
        partial(get, "price_list_rate", default=0),
        excepts(StopIteration, first, lambda __: {}),
    )

    get_price_list_data = compose(partial(valmap, get_price), _get_default_item_prices)

    def add_discounts(items):
        item_codes = compose(list, partial(pluck, "name"))(items)
        max_discounts_by_item = compose(partial(key_by, "name"), frappe.db.sql)(
            """
                SELECT name, max_discount FROM `tabItem`
                WHERE item_code IN %(item_codes)s
            """,
            values={"item_codes": item_codes},
            as_dict=1,
        )
        return [merge(x, max_discounts_by_item.get(x.get("name")), {}) for x in items]

    data = get_pos_data()

    return merge(
        data,
        {"price_list_data": get_price_list_data(data.get("doc").selling_price_list)},
        {"items": add_discounts(data.get("items"))},
    )


@frappe.whitelist()
def get_more_pos_data(profile, company):
    pos_profile = frappe.get_doc("POS Profile", profile)
    if not pos_profile:
        return frappe.throw(_("POS Profile: {} is not valid.".format(profile)))
    warehouse = pos_profile.warehouse or frappe.db.get_value(
        "Company", pos_profile.company, "default_warehouse"
    )
    settings = frappe.get_single("POS Bahrain Settings")
    if not warehouse:
        return frappe.throw(
            _("No valid Warehouse found. Please select warehouse in " "POS Profile.")
        )
    return {
        "batch_no_details": get_batch_no_details(warehouse, settings.use_batch_price),
        "barcode_details": _get_barcode_details() if settings.use_barcode_uom else None,
        "item_prices": _get_item_prices(pos_profile.selling_price_list),
        "uom_details": get_uom_details(),
        "exchange_rates": get_exchange_rates(),
        "do_not_allow_zero_payment": settings.do_not_allow_zero_payment,
        "use_batch_price": settings.use_batch_price,
        "use_barcode_uom": settings.use_barcode_uom,
        "use_custom_item_cart": settings.use_custom_item_cart,
        "use_stock_validator": settings.use_stock_validator,
        "use_sales_employee": settings.show_sales_employee,
        "sales_employee_details": _get_employees()
        if settings.show_sales_employee
        else None,
    }


def get_batch_no_details(warehouse, include_batch_price=0):
    extra_fields = (
        "pb_price_based_on, pb_rate, pb_discount," if include_batch_price else ""
    )

    batches = frappe.db.sql(
        """
            SELECT
                name,
                item,
                expiry_date, {extra_fields}
                (
                    SELECT SUM(actual_qty)
                    FROM `tabStock Ledger Entry`
                    WHERE batch_no=b.name AND
                        item_code=b.item AND
                        warehouse=%(warehouse)s
                ) as qty
            FROM `tabBatch` AS b
            WHERE IFNULL(expiry_date, '4000-10-10') >= CURDATE()
            ORDER BY expiry_date
        """.format(
            extra_fields=extra_fields
        ),
        values={"warehouse": warehouse},
        as_dict=1,
    )
    return groupby("item", filter(lambda x: x.get("qty"), batches))


def _get_barcode_details():
    barcodes = frappe.db.sql(
        """
            SELECT barcode, parent AS item_code, pb_uom AS uom
            FROM `tabItem Barcode` WHERE pb_uom IS NOT NULL
        """,
        as_dict=1,
    )
    return {x.barcode: x for x in barcodes}


def _get_item_prices(price_list):
    prices = frappe.db.sql(
        """
            SELECT item_code, uom, customer, currency, price_list_rate
            FROM `tabItem Price` WHERE price_list = %(price_list)s
        """,
        values={"price_list": price_list},
        as_dict=1,
    )
    return groupby("item_code", prices)


def _get_default_item_prices(price_list):
    prices = frappe.db.sql(
        """
            SELECT
                ip.item_code AS item_code,
                ip.price_list_rate AS price_list_rate
            FROM `tabItem Price` AS ip
            LEFT JOIN `tabItem` AS i on i.name = ip.item_code
            WHERE ip.price_list = %(price_list)s AND
                IFNULL(ip.customer, '') = '' AND
                IFNULL(ip.uom, '') IN ('', i.stock_uom) AND
                IFNULL(ip.min_qty, 0) <= 1 AND
                %(transaction_date)s BETWEEN
                    IFNULL(ip.valid_from, '2000-01-01') AND
                    IFNULL(ip.valid_upto, '2500-12-31')
        """,
        values={"price_list": price_list, "transaction_date": today()},
        as_dict=1,
    )
    return groupby("item_code", prices)


def _get_employees():
    return frappe.get_all(
        "Employee", filters={"status": "Active"}, fields=["name", "employee_name"]
    )


def get_uom_details():
    uoms = frappe.db.sql(
        """
            SELECT
                parent AS item_code,
                uom,
                conversion_factor
            FROM `tabUOM Conversion Detail`
        """,
        as_dict=1,
    )
    return groupby("item_code", uoms)


def _merge_dicts(x, y):
    z = x.copy()
    z.update(y)
    return z


def get_exchange_rates():
    from erpnext.setup.utils import get_exchange_rate

    mops = frappe.db.sql(
        """
            SELECT
                name AS mode_of_payment,
                alt_currency AS currency
            FROM `tabMode of Payment`
            WHERE in_alt_currency=1
        """,
        as_dict=1,
    )
    return {
        mop.mode_of_payment: mop
        for mop in map(
            lambda x: _merge_dicts(
                x,
                {
                    "conversion_rate": get_exchange_rate(
                        x.currency, frappe.defaults.get_user_default("currency")
                    )
                },
            ),
            mops,
        )
    }


@frappe.whitelist()
def get_retail_price(item_code):
    retail_price_list = frappe.db.get_value(
        "POS Bahrain Settings", None, "retail_price_list"
    )
    if retail_price_list:
        price = frappe.db.exists(
            "Item Price", {"item_code": item_code, "price_list": retail_price_list}
        )
        if price:
            return frappe.db.get_value("Item Price", price, "price_list_rate")
    return None


@frappe.whitelist()
def get_uom_from(barcode):
    return frappe.db.get_value(
        "Item Barcode", filters={"barcode": barcode}, fieldname="pb_uom"
    )


@frappe.whitelist()
def get_custom_item_cart_fields():
    return frappe.get_all(
        'POS Bahrain Settings Cart Fields',
        fields=['item_field', 'label', 'fieldtype', 'width'],
        order_by='idx'
    )


@frappe.whitelist()
def fetch_item_from_supplier_part_no(supplier_part_no):
    item = frappe.get_all(
        'Item Supplier',
        fields=['parent AS name'],
        filters=[['supplier_part_no', '=', supplier_part_no]],
        limit_page_length=1
    )
    return item[0] if item else None


@frappe.whitelist()
def query_uom(doctype, txt, searchfield, start, page_len, filters):
    return frappe.db.sql(
        """
            SELECT uom
            FROM `tabUOM Conversion Detail`
            WHERE uom LIKE %(txt)s {fcond}
            ORDER BY
                IF(LOCATE(%(_txt)s, uom), LOCATE(%(_txt)s, uom), 99999)
            LIMIT %(start)s, %(page_len)s
        """.format(
            fcond=get_filters_cond(
                "UOM Conversion Detail", {"parent": filters.get("item_code")}, []
            )
        ),
        values={
            "txt": "%%%s%%" % txt,
            "_txt": txt.replace("%", ""),
            "start": start,
            "page_len": page_len,
        },
    )
