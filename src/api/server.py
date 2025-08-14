# src/api/server.py
from __future__ import annotations

import logging
import os
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from src.ml.credit_model import CreditScoringModel

# ------------------------------------------------------------------------------
# Bootstrap & config
# ------------------------------------------------------------------------------
load_dotenv()

log = logging.getLogger("credit_api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

MODEL_PATH = os.environ.get("MODEL_PATH", "models/credit_model.pkl")
THRESH_APPROVE = float(os.environ.get("THRESH_APPROVE", "0.33"))
THRESH_REJECT  = float(os.environ.get("THRESH_REJECT", "0.67"))

model: CreditScoringModel | None = None


def _load_model() -> None:
    global model
    m = CreditScoringModel()
    m.load_model(MODEL_PATH)
    model = m
    log.info("Model loaded from %s", MODEL_PATH)

# ------------------------------------------------------------------------------
# FastAPI app
# ------------------------------------------------------------------------------
app = FastAPI(title="Credit Scoring API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# Serve the demo UI
app.mount("/ui", StaticFiles(directory="web", html=True), name="ui")

@app.get("/")
def root():
    return RedirectResponse(url="/ui/")

@app.on_event("startup")
def on_startup() -> None:
    _load_model()
    # Log the top features if available
    try:
        info = model.get_info()  # type: ignore
        top = info.get("top_features", [])[:10]
        log.info(
            "Top features (%s): %s",
            info.get("weights_kind"),
            ", ".join(f"{t['name']}={t['weight']:.4f}" for t in top),
        )
    except Exception as e:
        log.warning("Could not log model importances: %s", e)

# ------------------------------------------------------------------------------
# Schemas
# ------------------------------------------------------------------------------
Grade = Literal["A", "B", "C", "D", "E", "F", "G"]
Home  = Literal["RENT", "MORTGAGE", "OWN", "OTHER"]

class PredictIn(BaseModel):
    delinq_2yrs: int = Field(ge=0)
    delinq_2yrs_zero: int = Field(ge=0, le=1)
    dti: float = Field(ge=0)
    emp_length_num: int = Field(ge=0)
    grade: Grade
    home_ownership: Home
    inq_last_6mths: int = Field(ge=0)
    last_delinq_none: int = Field(ge=0, le=1)
    last_major_derog_none: int = Field(ge=0, le=1)
    open_acc: int = Field(ge=0)
    payment_inc_ratio: float = Field(ge=0)
    pub_rec: int = Field(ge=0)
    pub_rec_zero: int = Field(ge=0, le=1)
    purpose: str
    revol_util: float = Field(ge=0)
    short_emp: int = Field(ge=0, le=1)
    sub_grade_num: int = Field(ge=0)

class PredictOut(BaseModel):
    prob_default: float
    decision: Literal["APPROVE", "CONDITIONAL", "REJECT"]

class PredictSimpleIn(BaseModel):
    age: int = Field(..., ge=18)
    income: float = Field(..., ge=0)
    loan_amount: float = Field(..., ge=0)
    credit_score: int = Field(..., ge=300, le=850)

# ------------------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------------------
@app.get("/health")
@app.get("/healthz")
def health():
    return {"status": "ok", "model_loaded": model is not None}

@app.get("/model_info")
def model_info():
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return model.get_info()

@app.post("/predict", response_model=PredictOut)
def predict(payload: PredictIn):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    prob = float(model.predict(payload.model_dump()))
    prob = max(0.0, min(1.0, prob))  # clamp
    if prob <= THRESH_APPROVE:
        decision = "APPROVE"
    elif prob < THRESH_REJECT:
        decision = "CONDITIONAL"
    else:
        decision = "REJECT"
    return {"prob_default": prob, "decision": decision}

@app.post("/predict_simple", response_model=PredictOut)
def predict_simple(simple: PredictSimpleIn):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Minimal mapping from 4 inputs → 17 model features
    dti_pct = (simple.loan_amount / simple.income * 100.0) if simple.income > 0 else 0.0

    features = {
        "delinq_2yrs": 0,
        "delinq_2yrs_zero": 1,
        "dti": dti_pct,
        "emp_length_num": 5,
        "grade": "B",
        "home_ownership": "RENT",
        "inq_last_6mths": 0,
        "last_delinq_none": 1,
        "last_major_derog_none": 1,
        "open_acc": 5,
        "payment_inc_ratio": dti_pct,
        "pub_rec": 0,
        "pub_rec_zero": 1,
        "purpose": "credit card",
        "revol_util": 30,
        "short_emp": 0,
        "sub_grade_num": 5,
    }

    prob = float(model.predict(features))
    prob = max(0.0, min(1.0, prob))
    if prob <= THRESH_APPROVE:
        decision = "APPROVE"
    elif prob < THRESH_REJECT:
        decision = "CONDITIONAL"
    else:
        decision = "REJECT"
    return {"prob_default": prob, "decision": decision}
