# src/ml/credit_model.py
import warnings
warnings.filterwarnings("ignore")

import joblib
import numpy as np
import pandas as pd
import shap
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn_pandas import DataFrameMapper


class CreditScoringModel:
    """
    Modernized version of the original rorodata credit scoring model.
    Uses the same features and preprocessing as the original train.py.
    Adds:
      - feature_names captured from the DataFrameMapper expansion
      - get_info() for feature importances/coefficients
      - explain_prediction() that returns {feature: shap_value}
    """

    def __init__(self):
        self.model = None
        self.mapper = None
        self.explainer = None
        self.feature_names = None
        self.is_trained = False

        # Original feature list from train.py
        self.features = [
            "grade", "sub_grade_num", "short_emp", "emp_length_num",
            "home_ownership", "dti", "purpose", "payment_inc_ratio",
            "delinq_2yrs", "delinq_2yrs_zero", "inq_last_6mths",
            "last_delinq_none", "last_major_derog_none", "open_acc",
            "pub_rec", "pub_rec_zero", "revol_util"
        ]

        # Original column splits from train.py
        self.numerical_cols = [
            "sub_grade_num", "short_emp", "emp_length_num", "dti",
            "payment_inc_ratio", "delinq_2yrs", "delinq_2yrs_zero",
            "inq_last_6mths", "last_delinq_none", "last_major_derog_none",
            "open_acc", "pub_rec", "pub_rec_zero", "revol_util"
        ]

        self.categorical_cols = ["grade", "home_ownership", "purpose"]

    # --------------------------------------------------------------------- #
    # Mapper & feature-name helpers
    # --------------------------------------------------------------------- #
    def make_mapper(self):
        """Create the same mapper as the original train.py"""
        return DataFrameMapper([
            ("grade", sklearn.preprocessing.LabelBinarizer()),
            ("home_ownership", sklearn.preprocessing.LabelBinarizer()),
            ("purpose", sklearn.preprocessing.LabelBinarizer()),
        ])

    def _lb_column_names(self, colname, lb: sklearn.preprocessing.LabelBinarizer):
        """
        Names for columns created by LabelBinarizer.
        Binary → one column named with the positive class.
        Multi-class → one column per class.
        """
        classes = list(lb.classes_)
        if len(classes) == 2:
            return [f"{colname}={classes[1]}"]
        return [f"{colname}={c}" for c in classes]

    def _expanded_feature_names_from_mapper(self, df_example: pd.DataFrame):
        """
        Full list of feature names produced by DataFrameMapper (binarized
        categoricals) + the numeric columns appended in their original order.
        """
        names = []
        for (col, transformer) in self.mapper.features:
            if isinstance(transformer, sklearn.preprocessing.LabelBinarizer):
                names.extend(self._lb_column_names(col, transformer))
            else:
                names.append(str(col))
        names.extend(self.numerical_cols)
        return names

    # --------------------------------------------------------------------- #
    # Preprocess & predict
    # --------------------------------------------------------------------- #
    def preprocess(self, row: dict):
        """Exact preprocessing from original train.py."""
        data = list(row.values())
        colz = list(row.keys())
        dfx = pd.DataFrame(data=[data], columns=colz)

        XX1 = self.mapper.transform(dfx)
        XX2 = dfx[self.numerical_cols]
        XX = np.hstack((XX1, XX2))
        return XX

    def predict(self, row: dict) -> float:
        """Probability of default (p(bad=1))."""
        if not self.is_trained:
            raise ValueError("Model must be trained first")
        processed_row = self.preprocess(row)
        return float(self.model.predict_proba(processed_row)[:, 1][0])

    # --------------------------------------------------------------------- #
    # Train (with synthetic fallback) & explainability
    # --------------------------------------------------------------------- #
    def train_with_data(self, data_url: str | None = None) -> float:
        """Train model; returns holdout accuracy."""
        if data_url is None:
            clean_data = self._create_synthetic_data()
        else:
            loans = pd.read_csv(data_url, infer_datetime_format=True)
            clean_data = loans[self.features + ["bad_loans"]].dropna()

        self.mapper = self.make_mapper()

        # Fit mapper and capture expanded feature names
        X1 = self.mapper.fit_transform(clean_data)
        self.feature_names = self._expanded_feature_names_from_mapper(clean_data)

        X2 = np.array(clean_data[self.numerical_cols])
        X = np.hstack((X1, X2))
        y = np.array(clean_data["bad_loans"])

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.33, random_state=100, stratify=y
        )

        # RandomForest gives importances out of the box (good for demo)
        self.model = RandomForestClassifier(
            n_estimators=100, random_state=42, class_weight="balanced"
        )
        self.model.fit(X_train, y_train)

        test_score = float(self.model.score(X_test, y_test))

        # SHAP explainer (optional in API; handy locally)
        try:
            self.explainer = shap.TreeExplainer(self.model)
        except Exception:
            self.explainer = None

        self.is_trained = True
        return test_score

    def _create_synthetic_data(self) -> pd.DataFrame:
        """Create synthetic lending-like data for demo purposes."""
        np.random.seed(42)
        n = 5000
        df = pd.DataFrame({
            "grade": np.random.choice(list("ABCDEFG"), n),
            "sub_grade_num": np.random.uniform(0, 1, n),
            "short_emp": np.random.choice([0, 1], n, p=[0.7, 0.3]),
            "emp_length_num": np.random.randint(0, 10, n),
            "home_ownership": np.random.choice(["RENT", "OWN", "MORTGAGE"], n),
            "dti": np.random.uniform(0, 50, n),
            "purpose": np.random.choice(
                ["vacation", "debt_consolidation", "home_improvement", "major_purchase"], n
            ),
            "payment_inc_ratio": np.random.uniform(0, 20, n),
            "delinq_2yrs": np.random.poisson(0.5, n),
            "delinq_2yrs_zero": np.random.choice([0, 1], n, p=[0.3, 0.7]),
            "inq_last_6mths": np.random.poisson(2, n),
            "last_delinq_none": np.random.choice([0, 1], n, p=[0.2, 0.8]),
            "last_major_derog_none": np.random.choice([0, 1], n, p=[0.1, 0.9]),
            "open_acc": np.random.poisson(8, n),
            "pub_rec": np.random.poisson(0.2, n),
            "pub_rec_zero": np.random.choice([0, 1], n, p=[0.2, 0.8]),
            "revol_util": np.random.uniform(0, 100, n),
        })

        # Heuristic risk → bad_loans
        risk = (
            (df["dti"] > 30) * 0.3
            + (df["delinq_2yrs"] > 0) * 0.4
            + (df["revol_util"] > 80) * 0.2
            + (df["grade"].isin(["F", "G"])) * 0.3
            + np.random.normal(0, 0.1, n)
        )
        df["bad_loans"] = (risk > 0.4).astype(int)
        return df

    def get_info(self) -> dict:
        """
        Summarize estimator and feature weights (importances/coefficients).
        Returns:
          {
            estimator_cls: "...",
            weights_kind: "feature_importances_" | "coef_" | None,
            feature_names: [...],
            top_features: [{name, weight}, ...]  // sorted by |weight|
          }
        """
        info = {}
        est = self.model
        info["estimator_cls"] = type(est).__name__

        feats = self.feature_names
        weights, kind = None, None

        if hasattr(est, "feature_importances_"):
            weights = est.feature_importances_.tolist()
            kind = "feature_importances_"
        elif hasattr(est, "coef_"):
            coef = est.coef_
            coef = coef[0] if getattr(coef, "ndim", 1) > 1 else coef
            weights = [float(x) for x in coef]
            kind = "coef_"

        info["weights_kind"] = kind

        if weights is not None:
            if not feats or len(feats) != len(weights):
                feats = feats or [f"feat_{i}" for i in range(len(weights))]
            pairs = sorted(zip(feats, weights), key=lambda kv: abs(kv[1]), reverse=True)
            info["top_features"] = [{"name": k, "weight": float(v)} for k, v in pairs]
            info["feature_names"] = feats
        else:
            info["top_features"] = []
            info["feature_names"] = feats or []

        return info

    def explain_prediction(self, row: dict) -> dict:
        """
        SHAP values for a single example as {feature: shap_value}.
        (For RandomForest TreeExplainer, we take the positive-class SHAP.)
        """
        if self.explainer is None:
            raise ValueError("Model must be trained first (no explainer)")

        processed_row = self.preprocess(row)  # shape (1, n_features)
        shap_values = self.explainer.shap_values(processed_row)

        if isinstance(shap_values, list) and len(shap_values) == 2:
            sv = shap_values[1][0]
        else:
            sv = shap_values[0] if getattr(shap_values, "ndim", 1) > 1 else shap_values

        feats = self.feature_names or [f"feat_{i}" for i in range(len(sv))]
        return {feat: float(val) for feat, val in zip(feats, sv)}

    # --------------------------------------------------------------------- #
    # Persist
    # --------------------------------------------------------------------- #
    def save_model(self, model_path: str):
        if not self.is_trained:
            raise ValueError("No trained model to save")
        joblib.dump({
            "model": self.model,
            "mapper": self.mapper,
            "explainer": self.explainer,
            "features": self.features,
            "numerical_cols": self.numerical_cols,
            "categorical_cols": self.categorical_cols,
            "feature_names": self.feature_names,
        }, model_path)

    def load_model(self, model_path: str):
        data = joblib.load(model_path)
        self.model = data["model"]
        self.mapper = data["mapper"]
        self.explainer = data.get("explainer")
        self.features = data.get("features", self.features)
        self.numerical_cols = data.get("numerical_cols", self.numerical_cols)
        self.categorical_cols = data.get("categorical_cols", self.categorical_cols)
        self.feature_names = data.get("feature_names")
        self.is_trained = True


# ------------------------------------------------------------------------- #
# Local quick test (optional)
# ------------------------------------------------------------------------- #
def create_sample_application() -> dict:
    return {
        "delinq_2yrs": 0.0, "delinq_2yrs_zero": 1.0, "dti": 8.72, "emp_length_num": 0,
        "grade": "F", "home_ownership": "RENT", "inq_last_6mths": 3.0, "last_delinq_none": 1,
        "last_major_derog_none": 1, "open_acc": 2.0, "payment_inc_ratio": 4.5, "pub_rec": 0.0,
        "pub_rec_zero": 1.0, "purpose": "vacation", "revol_util": 98.5, "short_emp": 0,
        "sub_grade_num": 1.0
    }

if __name__ == "__main__":
    model = CreditScoringModel()
    print("Training...")
    acc = model.train_with_data()
    print("Holdout accuracy:", acc)
    sample = create_sample_application()
    p = model.predict(sample)
    print("Sample PD:", p)
    model.save_model("../models/credit_model.pkl")
