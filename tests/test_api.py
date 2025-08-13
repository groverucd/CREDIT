def test_health(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json().get("status") in {"ok", "healthy"}

def test_predict_smoke(client):
    payload = {
        "delinq_2yrs": 0,
        "delinq_2yrs_zero": 1,
        "dti": 10,
        "emp_length_num": 1,
        "grade": "B",
        "home_ownership": "RENT",
        "inq_last_6mths": 1,
        "last_delinq_none": 1,
        "last_major_derog_none": 1,
        "open_acc": 3,
        "payment_inc_ratio": 5,
        "pub_rec": 0,
        "pub_rec_zero": 1,
        "purpose": "credit card",
        "revol_util": 20,
        "short_emp": 0,
        "sub_grade_num": 5,
    }
    r = client.post("/predict", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert 0.0 <= data["prob_default"] <= 1.0
    assert data["decision"] in {"APPROVE", "CONDITIONAL", "REJECT"}
