import os
os.environ.setdefault("MODEL_PATH", "models/credit_model.pkl")

from starlette.testclient import TestClient
from src.api.server import app

client = TestClient(app)

def test_predict_simple_smoke():
    payload = {"age": 35, "income": 50000, "loan_amount": 10000, "credit_score": 700}
    r = client.post("/predict_simple", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert 0.0 <= data["prob_default"] <= 1.0
    assert data["decision"] in {"APPROVE","CONDITIONAL","REJECT"}
