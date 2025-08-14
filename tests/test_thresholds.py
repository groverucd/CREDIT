import os

def test_thresholds_order():
    low = float(os.environ.get("THRESH_APPROVE", "0.33"))
    high = float(os.environ.get("THRESH_REJECT", "0.67"))
    assert 0.0 <= low < high <= 1.0, \
        f"Invalid thresholds: APPROVE={low}, REJECT={high}"
