import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'repo'))
from app import unique_ids, unique_tags, unique_pairs

def test_ids(): assert unique_ids([1,2,2,3,1]) == [1,2,3]
def test_tags(): assert unique_tags(['a','b','a']) == ['a','b']
def test_pairs(): assert unique_pairs([(1,2),(1,2),(3,4)]) == [(1,2),(3,4)]
