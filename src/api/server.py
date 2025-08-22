# src/api/server.py
from __future__ import annotations

import logging
import os
from typing import List, Optional, Literal

import httpx  # pip install httpx
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
THRESH_REJECT  = float(os.environ.get("THRESH_REJECT",  "0.67"))

model: CreditScoringModel | None = None

def _load_model() -> None:
    global model
    m = CreditScoringModel()
    m.load_model(MODEL_PATH)
    model = m
    log.info("Model loaded from %s", MODEL_PATH)

# ------------------------------------------------------------------------------
# Helpers for loan impact
# ------------------------------------------------------------------------------
def monthly_payment(principal: float, months: int, apr: float) -> float:  
    """Amortized monthly payment (APR as a decimal, e.g. 0.18 for 18%)."""
    if principal <= 0 or months <= 0:
        return 0.0
    r = apr / 12.0
    if r <= 0:
        return principal / months
    return principal * (r / (1 - (1 + r) ** (-months)))

# Rough APR anchors by grade
APR_BY_GRADE = {
    "A": 0.10, "B": 0.14, "C": 0.18, "D": 0.22,
    "E": 0.26, "F": 0.30, "G": 0.34,
}

# ------------------------------------------------------------------------------
# FastAPI app
# ------------------------------------------------------------------------------
app = FastAPI(title="Credit Scoring API", version="1.1.0")

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

class PredictInExtended(PredictIn):
    loan_amount: Optional[float] = Field(default=None, ge=0)
    term: Optional[int] = Field(default=36, ge=1)
    monthly_income: Optional[float] = Field(default=None, ge=0)  
    
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
    prob = max(0.0, min(1.0, prob))
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

    monthly_income = simple.income / 12.0 if simple.income > 0 else 0.0
    grade = "B"
    if simple.credit_score >= 760: grade = "A"
    elif simple.credit_score >= 700: grade = "B"
    elif simple.credit_score >= 660: grade = "C"
    elif simple.credit_score >= 620: grade = "D"
    elif simple.credit_score >= 580: grade = "E"
    elif simple.credit_score >= 540: grade = "F"
    else: grade = "G"

    dti_pct = (simple.loan_amount / simple.income * 100.0) if simple.income > 0 else 0.0
        
    features = {
        "delinq_2yrs": 0,
        "delinq_2yrs_zero": 1,
        "dti": dti_pct,
        "emp_length_num": 5,  
        "grade": grade,
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
        "sub_grade_num": 10,
    }
    
    prob = float(model.predict(features))
    prob = max(0.0, min(1.0, prob))
    decision = "APPROVE" if prob <= THRESH_APPROVE else ("CONDITIONAL" if prob < THRESH_REJECT else "REJECT")
    return {"prob_default": prob, "decision": decision}
    
@app.post("/predict_loan", response_model=PredictOut)
def predict_loan(payload: PredictInExtended):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    feats = payload.model_dump()
    loan_amount = feats.pop("loan_amount", None)
    term = int(feats.pop("term", 36) or 36)
    monthly_income = feats.pop("monthly_income", None)
        
    if loan_amount is not None:
        apr = APR_BY_GRADE.get(feats.get("grade", "C"), 0.20)
        pmt = monthly_payment(float(loan_amount), term, apr)
        
        base_pir = float(feats.get("payment_inc_ratio", 0.0))
        if monthly_income is not None and monthly_income > 0:
            new_pir = (pmt / float(monthly_income)) * 100.0
        else:
            new_pir = max(base_pir, pmt * 0.10)
    
        feats["payment_inc_ratio"] = new_pir
    
    prob = float(model.predict(feats))
    prob = max(0.0, min(1.0, prob))
    decision = "APPROVE" if prob <= THRESH_APPROVE else ("CONDITIONAL" if prob < THRESH_REJECT else "REJECT")
    return {"prob_default": prob, "decision": decision}

# ------------------------------------------------------------------------------
# Cerebras AI Chat endpoint
# ------------------------------------------------------------------------------
class ChatIn(BaseModel):
    messages: list[dict]

@app.post("/api/ai-chat")
async def ai_chat(body: ChatIn):
    CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")
    if not CEREBRAS_API_KEY:
        raise HTTPException(status_code=500, detail="Cerebras API key not set")

    url = "https://api.cerebras.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {CEREBRAS_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "llama3.1-8b",
        "temperature": 0.2,
        "stream": False,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are the AI helper for a Credit Scoring demo website. "
                    "Explain grades/subgrades, DTI, credit utilization, delinquencies, "
                    "employment length, open accounts, etc. "
                    "Educational guidance only; no financial advice."
                ),
            },
            *body.messages,
        ],
    }

    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(url, headers=headers, json=payload, timeout=30.0)
            r.raise_for_status()
            return r.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
