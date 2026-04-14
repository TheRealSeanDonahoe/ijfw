def page_count(total, page_size):
    if page_size <= 0:
        raise ValueError("page_size must be positive")
    # BUG: off-by-one when total % page_size == 0
    return total // page_size + 1
