import numpy as np
import pandas as pd

# Reproducible randomness
np.random.seed(42)

# Loan categories and their strictness multipliers
loan_types = {
    "car": 0.95,
    "credit_card": 1.10,
    "debt_consolidation": 0.90,
    "home_improvement": 1.00,
    "medical": 0.95,
    "small_business": 1.20
}

# Number of samples per category
samples_per_type = 10000

# Grade options (better grades = lower risk)
grades = ["A", "B", "C", "D", "E", "F", "G"]

# Home ownership categories
home_ownership_types = ["RENT", "OWN", "MORTGAGE"]

# Employment length options
emp_length_options = list(range(0, 11))  # 0 to 10 years

def generate_data_for_type(loan_type, multiplier, n):
    """Generate realistic synthetic loan data for one loan type."""
    data = {
        "grade": np.random.choice(grades, n, p=[0.15, 0.20, 0.25, 0.20, 0.10, 0.07, 0.03]),
        "sub_grade_num": np.random.uniform(0, 1, n),
        "short_emp": np.random.choice([0, 1], n, p=[0.7, 0.3]),
        "emp_length_num": np.random.choice(emp_length_options, n, p=[0.05,0.05,0.10,0.10,0.10,0.15,0.15,0.10,0.10,0.05,0.05]),
        "home_ownership": np.random.choice(home_ownership_types, n, p=[0.4, 0.2, 0.4]),
        "dti": np.random.uniform(5, 40, n),  # debt-to-income ratio
        "purpose": [loan_type] * n,
        "payment_inc_ratio": np.random.uniform(1, 15, n),
        "delinq_2yrs": np.random.poisson(0.5, n),
        "delinq_2yrs_zero": np.random.choice([0, 1], n, p=[0.3, 0.7]),
        "inq_last_6mths": np.random.poisson(2, n),
        "last_delinq_none": np.random.choice([0, 1], n, p=[0.2, 0.8]),
        "last_major_derog_none": np.random.choice([0, 1], n, p=[0.1, 0.9]),
        "open_acc": np.random.poisson(8, n),
        "pub_rec": np.random.poisson(0.2, n),
        "pub_rec_zero": np.random.choice([0, 1], n, p=[0.2, 0.8]),
        "revol_util": np.random.uniform(0, 100, n)
    }

    df = pd.DataFrame(data)

    # Compute a synthetic risk score
    risk_score = (
        (df["dti"] > 30) * 0.3 +
        (df["delinq_2yrs"] > 0) * 0.4 +
        (df["revol_util"] > 80) * 0.2 +
        (df["grade"].isin(["F", "G"])) * 0.3 +
        np.random.normal(0, 0.1, n)
    ) * multiplier

    # Label: 1 = bad loan, 0 = good loan
    df["bad_loans"] = (risk_score > 0.4).astype(int)

    return df

# Generate for all types and combine
all_data = []
for loan_type, mult in loan_types.items():
    print(f"Generating {samples_per_type} samples for {loan_type}...")
    df_type = generate_data_for_type(loan_type, mult, samples_per_type)
    all_data.append(df_type)

final_df = pd.concat(all_data, ignore_index=True)

# Save dataset
output_path = "../data/loans_dataset.csv"
final_df.to_csv(output_path, index=False)
print(f"✅ Dataset saved to {output_path} with {len(final_df)} rows.")
