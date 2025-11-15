# 🧠 EquilibrAl — Credit Risk Scoring Engine
*A production-grade, explainable ML system for creditworthiness evaluation.*

---

## 🚀 Overview
EquilibrAl is an end-to-end credit risk inference engine built to simulate real-world lending workflows.  
It estimates a borrower’s **Probability of Default (PD)** using engineered financial indicators and maps that probability to transparent **Approve / Conditional / Reject** decisions.

This project includes:
- A **FastAPI backend** for real-time scoring  
- A **Random Forest model** trained on synthetic bureau-style data  
- Fully engineered **financial features**  
- Calibrated, auditable **decision thresholds**  
- A clean, interactive **web UI**  
- **Dockerized deployment** on Render  

---

## ✨ Features

### Machine Learning
- Random Forest classifier trained on synthetic credit bureau data  
- Balanced classes for realistic approval distributions  
- Probability-of-default (PD) scoring  
- Calibrated decision thresholds:
  - Approve  
  - Conditional  
  - Reject  

### Feature Engineering
- Debt-to-Income Ratio (DTI)  
- Revolving Utilization (`revol_util`)  
- Credit Grade / Sub-grade  
- Delinquencies, Inquiries, Derogatories  
- Employment Length  
- Open Accounts  
- Public Records Flags  

### Backend
- FastAPI inference server  
- `/predict` REST endpoint  
- Pydantic validation  
- Logging + error handling  
- Fully containerized with Docker  

### Frontend
- Lightweight interactive UI  
- Real-time PD + decision display  
- Form-based input for borrower profiles  
- Responsive layout  

### Deployment
- Dockerized  
- Hosted on Render  
- Automatic build + inference pipeline  

---

## 🏗 Project Structure

---

## 🔢 API Usage

### `POST /predict`

**Request Body**
```json
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
{
  "pd": 0.087,
  "decision": "Approve"
}
