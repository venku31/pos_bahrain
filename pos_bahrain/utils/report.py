from frappe import _


def make_column(key, label=None, type="Data", width=120, **kwargs):
    print(kwargs)
    return {
        "label": _(label or key.replace("_", " ").title()),
        "fieldname": key,
        "fieldtype": type,
        "width": width,
        **kwargs,
    }
