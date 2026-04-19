from utils import dedupe_ints, dedupe_strs, dedupe_tuples

def unique_ids(xs): return dedupe_ints(xs)
def unique_tags(xs): return dedupe_strs(xs)
def unique_pairs(xs): return dedupe_tuples(xs)
