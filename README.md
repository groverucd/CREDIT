# CREDIT - Credit Scoring API

This project is a FastAPI-based machine learning app that predicts creditworthiness.

## Setup

1. Create a virtual environment:
   ```
   python -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Run the API:
   ```
   uvicorn src.api.server:app --reload
   ```

## Testing
Run all tests:
```
pytest -q
```


## Production API

Base URL: https://credit-6wok.onrender.com

### POST /predict_simple
Body:
{
  "age": 35,
  "income": 50000,
  "loan_amount": 10000,
  "credit_score": 700
}

Response:
{
  "prob_default": 0.25,
  "decision": "APPROVE"
}
