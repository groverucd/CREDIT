# src/api/server.py

from __future__ import annotations

import os
import logging
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.ml.credit_model import CreditScoringModel

# --- bootstrap & config -------------------------------------------------------

load_dotenv()  # load .env into environment

log = logging.getLogger("credit_api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

MODEL_PATH = os.environ.get("MODEL_PATH", "models/credit_model.pkl")

# decision thresholds (<= APPROVE, between -> CONDITIONAL, >= REJECT)
THRESH_APPROVE = float(os.environ.get("THRESH_APPROVE", "0.33"))
THRESH_REJECT = float(os.environ.get("THRESH_REJECT", "0.67"))

# global model handle populated on startup
model: CreditScoringModel | None = None


def _load_model() -> None:
    """Load trained model from disk into global `model`."""
    global model
    m = CreditScoringModel()
    m.load_model(MODEL_PATH)
    model = m
    log.info("Model loaded from %s", MODEL_PATH)


# --- api app ------------------------------------------------------------------

app = FastAPI(title="Credit Scoring API", version="1.0.0")

# open CORS for local testing / future ui
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    try:
        _load_model()
    except Exception as e:
        log.exception("Failed to load model: %s", e)
        # keep raising so /predict returns 503 until fixed
        raise


# --- schemas ------------------------------------------------------------------

Grade = Literal["A", "B", "C", "D", "E", "F", "G"]
Home = Literal["RENT", "MORTGAGE", "OWN", "OTHER"]


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


# --- endpoints ----------------------------------------------------------------

@app.get("/health")
@app.get("/healthz")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/predict", response_model=PredictOut)
def predict(payload: PredictIn):
    if model is None:
        # model failed to load at startup
        raise HTTPException(status_code=503, detail="Model not loaded")

    features = payload.model_dump()
    prob = float(model.predict(features))
    # clamp to [0, 1] just in case
    prob = max(0.0, min(1.0, prob))

    if prob <= THRESH_APPROVE:
        decision = "APPROVE"
    elif prob < THRESH_REJECT:
        decision = "CONDITIONAL"
    else:
        decision = "REJECT"

    return {"prob_default": prob, "decision": decision}
