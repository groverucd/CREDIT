# src/ml/credit_model.py

import os
import joblib
import warnings
from typing import Dict, Any, List

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn_pandas import DataFrameMapper
from sklearn.preprocessing import LabelBinarizer
from sklearn.ensemble import RandomForestClassifier

warnings.filterwarnings("ignore")


class CreditScoringModel:
    """
    Credit scoring model that:
      - Trains on data/loans_dataset.csv (your 60k synthetic set)
      - Uses one-hot-like binarizers for categorical variables
      - Exposes predict(row_dict) -> probability of default
      - Saves/loads to/from models/credit_model.pkl
    """

    # Feature order expected by the API and the dataset
    features: List[str] = [
        "grade",
        "sub_grade_num",
        "short_emp",
        "emp_length_num",
        "home_ownership",
        "dti",
        "purpose",
        "payment_inc_ratio",
        "delinq_2yrs",
        "delinq_2yrs_zero",
        "inq_last_6mths",
        "last_delinq_none",
        "last_major_derog_none",
        "open_acc",
        "pub_rec",
        "pub_rec_zero",
        "revol_util",
    ]

    numerical_cols: List[str] = [
        "sub_grade_num",
        "short_emp",
        "emp_length_num",
        "dti",
        "payment_inc_ratio",
        "delinq_2yrs",
        "delinq_2yrs_zero",
        "inq_last_6mths",
        "last_delinq_none",
        "last_major_derog_none",
        "open_acc",
        "pub_rec",
        "pub_rec_zero",
        "revol_util",
    ]

    categorical_cols: List[str] = ["grade", "home_ownership", "purpose"]

    def __init__(self) -> None:
        self.model: RandomForestClassifier | None = None
        self.mapper: DataFrameMapper | None = None
        self.is_trained: bool = False

    # ---------- Preprocessing ----------

    def make_mapper(self) -> DataFrameMapper:
        """Create mapper for categorical variables using LabelBinarizer."""
        return DataFrameMapper(
            [
                ("grade", LabelBinarizer()),
                ("home_ownership", LabelBinarizer()),
                ("purpose", LabelBinarizer()),
            ],
            df_out=False,
            input_df=True,
        )

    def preprocess(self, row: Dict[str, Any]) -> np.ndarray:
        """
        Transform a single-row dict into the model feature vector.
        """
        if self.mapper is None:
            raise RuntimeError("Mapper is not fitted.")

        # Keep only expected columns, in the expected order
        data = {k: row[k] for k in self.features}
        dfx = pd.DataFrame([data], columns=self.features)

        XX1 = self.mapper.transform(dfx)  # categorical
        XX2 = dfx[self.numerical_cols].to_numpy()  # numeric
        XX = np.hstack((XX1, XX2))
        return XX

    # ---------- Inference ----------

    def predict(self, row: Dict[str, Any]) -> float:
        """
        Return probability of default (class 1).
        """
        if not self.is_trained or self.model is None:
            raise RuntimeError("Model must be trained or loaded before predict().")

        X = self.preprocess(row)
        prob = float(self.model.predict_proba(X)[:, 1][0])
        return prob

    # ---------- Training ----------

    def train_from_csv(
        self,
        csv_path: str = "data/loans_dataset.csv",
        target_col: str = "bad_loans",
        test_size: float = 0.2,
        random_state: int = 42,
    ) -> float:
        """
        Train model from a CSV created by your generator script.
        Returns held-out accuracy.
        """
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"Dataset not found at {csv_path}")

        df = pd.read_csv(csv_path)

        # Basic sanity check
        required_cols = set(self.features + [target_col])
        missing = required_cols - set(df.columns)
        if missing:
            raise ValueError(f"Dataset missing columns: {missing}")

        # Fit mapper on full dataset (categoricals)
        self.mapper = self.make_mapper()
        X_cat = self.mapper.fit_transform(df[self.features])
        X_num = df[self.numerical_cols].to_numpy()
        X = np.hstack((X_cat, X_num))
        y = df[target_col].to_numpy().astype(int)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y
        )

        # RandomForest is robust and quick
        self.model = RandomForestClassifier(
            n_estimators=200,
            max_depth=None,
            min_samples_leaf=2,
            class_weight="balanced",
            random_state=random_state,
            n_jobs=-1,
        )
        self.model.fit(X_train, y_train)
        acc = self.model.score(X_test, y_test)
        self.is_trained = True
        return acc

    # ---------- Persistence ----------

    def save_model(self, model_path: str) -> None:
        if not self.is_trained or self.model is None or self.mapper is None:
            raise RuntimeError("Nothing to save, train first.")
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        blob = {"model": self.model, "mapper": self.mapper}
        joblib.dump(blob, model_path)

    def load_model(self, model_path: str) -> None:
        if not os.path.exists(model_path):
            raise FileNotFoundError(model_path)
        blob = joblib.load(model_path)
        self.model = blob["model"]
        self.mapper = blob["mapper"]
        self.is_trained = True
