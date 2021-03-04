import frappe
from toolz import first


@frappe.whitelist()
def get_selling_rate(item, price_list, currency):
    item_price = frappe.get_all(
        "Item Price",
        filters={
            "item_code": item,
            "price_list": price_list,
            "currency": currency,
            "selling": 1,
        },
        fields=["price_list_rate"],
    )
    return first(item_price)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def price_list_query(doctype, txt, searchfield, start, page_len, filters):
    query = """
        SELECT 
            pl.name,
            CONCAT_WS(": ", "Rate", ifnull(round(ip.price_list_rate, 2), 0 )) rate
        FROM `tabPrice List` pl
        LEFT JOIN `tabItem Price` ip ON ip.price_list = pl.name
        WHERE pl.name LIKE {txt}
        AND ip.item_code = %(item_code)s
        AND pl.currency = %(currency)s
        AND pl.selling = %(selling)s
        LIMIT {start}, {page_len}
    """.format(
        txt=frappe.db.escape("%{0}%".format(txt)),
        start=start,
        page_len=page_len
    )

    return frappe.db.sql(query, filters)
