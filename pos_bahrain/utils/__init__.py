from toolz import keyfilter, reduceby, merge


def pick(whitelist, d):
    return keyfilter(lambda k: k in whitelist, d)


def key_by(key, items):
    return reduceby(key, lambda a, x: merge(a, x), items, {})
