🧠 EquilibrAl — Credit Risk Scoring & Decision Engine

A production-style, explainable ML system for creditworthiness evaluation.

🚀 Overview

EquilibrAl is an end-to-end credit risk scoring and decision engine designed to mirror real-world lending workflows.
The system estimates a borrower’s Probability of Default (PD) from structured financial indicators and maps that probability to transparent, auditable lending decisions.

The project emphasizes engineering clarity and system design over model novelty, focusing on how machine-learning outputs are operationalized in practice.

🔁 Iteration Note

This project was originally built as a learning-focused credit risk engine.
Since its initial version, the documentation and system framing have been refined to better reflect production considerations such as explicit decision logic, auditability, and deployment clarity.
The underlying tool and system behavior remain unchanged.

🎯 Problem Statement

Credit scoring systems are often treated as black boxes, making it difficult to understand how risk predictions translate into real decisions.

EquilibrAl explores how probabilistic ML outputs can be combined with explicit policy logic to create systems that are:

interpretable

auditable

suitable for real lending pipelines

The goal is not only to predict risk, but to responsibly operationalize it.

🧩 System Architecture

High-level pipeline:

Borrower attributes are submitted via API

Inputs are validated and preprocessed

A trained ML model estimates Probability of Default (PD)

Business rules map PD → lending decision

Results are returned via API and displayed in the UI

Design characteristics

Stateless inference service

Clear separation of prediction and decision policy

Deterministic, explainable outputs

✨ Core Features
🧠 Machine Learning

Random Forest classifier trained on synthetic bureau-style data

Probability-based output (PD instead of binary labels)

Balanced class distribution to avoid skewed approvals

Fast, stable inference suitable for API deployment

🧮 Feature Engineering

Engineered features commonly used in credit risk modeling:

Debt-to-Income ratio (DTI)

Revolving utilization

Credit grade / sub-grade

Delinquencies and recent inquiries

Employment length

Number of open accounts

Public record flags

📊 Decision Logic

PD scores are mapped to explicit decision bands:

Approve — low default risk

Conditional — moderate risk, manual review recommended

Reject — high default risk

Separating prediction from policy improves transparency and governance.

⚙️ Backend & API

FastAPI inference server

Typed request/response validation using Pydantic

REST endpoint for real-time scoring

Structured error handling and logging

Designed to be horizontally scalable

Example Endpoint

POST /predict

Request

{
  "dti": 21.3,
  "revol_util": 42.1,
  "grade": "B",
  "delinq": 0,
  "inq_last_6m": 1,
  "emp_length": 4,
  "open_accounts": 6,
  "pub_rec": 0
}


Response

{
  "pd": 0.087,
  "decision": "Approve"
}

🖥 Frontend

Lightweight, responsive UI

Form-based borrower profile input

Real-time display of PD and decision outcome

Designed to demonstrate full system flow rather than UI complexity

🚢 Deployment

Fully Dockerized application

Deployed on Render

Automatic build and deployment pipeline

Environment-agnostic setup suitable for cloud hosting

🧪 Model Evaluation (High-Level)

Evaluated on held-out validation data

Focus on stability of PD estimates, not just accuracy

Emphasis on consistent risk ranking rather than threshold optimization

In real lending systems, probability calibration and policy alignment often matter more than raw accuracy.

⚖️ Design Decisions & Tradeoffs

Random Forest vs deep models
Chosen for interpretability, stability, and fast inference.

Synthetic data
Used to safely simulate bureau-style datasets while preserving realistic feature relationships.

Explicit decision thresholds
Improves auditability by separating ML prediction from business policy.

🔮 Future Improvements

Probability calibration (Platt scaling / isotonic regression)

Feature attribution and local explanations (e.g., SHAP)

Model monitoring and drift detection

Persistent decision logging

Authentication and access control

📌 What This Project Demonstrates

End-to-end ML system design

Production-oriented API development

Practical feature engineering

Risk modeling fundamentals

Engineering tradeoff awareness

This project is intentionally scoped to emphasize clarity, correctness, and deployability over complexity.
