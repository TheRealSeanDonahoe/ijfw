import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'repo'))
from paginate import page_count

def test_exact_multiple():
    assert page_count(100, 10) == 10

def test_partial():
    assert page_count(101, 10) == 11

def test_single():
    assert page_count(1, 10) == 1

def test_zero():
    assert page_count(0, 10) == 0
