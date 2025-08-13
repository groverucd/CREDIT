import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelBinarizer
from sklearn_pandas import DataFrameMapper
import sklearn
import shap
import warnings
warnings.filterwarnings('ignore')

class CreditScoringModel:
    """
    Modernized version of the original rorodata credit scoring model
    Uses the same features and preprocessing as the original train.py
    """
    
    def __init__(self):
        self.model = None
        self.mapper = None
        self.explainer = None
        
        # Original feature list from train.py
        self.features = [
            'grade', 'sub_grade_num', 'short_emp', 'emp_length_num', 
            'home_ownership', 'dti', 'purpose', 'payment_inc_ratio',
            'delinq_2yrs', 'delinq_2yrs_zero', 'inq_last_6mths', 
            'last_delinq_none', 'last_major_derog_none', 'open_acc',
            'pub_rec', 'pub_rec_zero', 'revol_util'
        ]
        
        # Original column splits from train.py
        self.numerical_cols = [
            'sub_grade_num', 'short_emp', 'emp_length_num', 'dti', 
            'payment_inc_ratio', 'delinq_2yrs', 'delinq_2yrs_zero', 
            'inq_last_6mths', 'last_delinq_none', 'last_major_derog_none', 
            'open_acc', 'pub_rec', 'pub_rec_zero', 'revol_util'
        ]
        
        self.categorical_cols = ['grade', 'home_ownership', 'purpose']
        self.is_trained = False
    
    def make_mapper(self):
        """Create the same mapper as original train.py"""
        return DataFrameMapper([
            ('grade', sklearn.preprocessing.LabelBinarizer()),
            ('home_ownership', sklearn.preprocessing.LabelBinarizer()),
            ('purpose', sklearn.preprocessing.LabelBinarizer()),
        ])
    
    def preprocess(self, row):
        """
        Exact preprocessing from original train.py preprocess() function
        """
        data = list(row.values())
        colz = list(row.keys())
        dfx = pd.DataFrame(data=[data], columns=colz)
        
        XX1 = self.mapper.transform(dfx)
        XX2 = dfx[self.numerical_cols]
        XX = np.hstack((XX1, XX2))
        return XX
    
    def predict(self, row):
        """
        Exact prediction from original train.py predict() function
        """
        if not self.is_trained:
            raise ValueError("Model must be trained first")
            
        try:
            processed_row = self.preprocess(row)
            return self.model.predict_proba(processed_row)[:, 1][0]
        except Exception as e:
            print(f"Prediction error: {e}")
            return -1
    
    def train_with_data(self, data_url=None):
        """
        Train model using the same logic as original train.py
        """
        if data_url is None:
            # Use synthetic data for demo since we can't access original S3
            print("Creating synthetic training data...")
            clean_data = self._create_synthetic_data()
        else:
            print(f"Reading data from {data_url}")
            loans = pd.read_csv(data_url, infer_datetime_format=True)
            clean_data = loans[self.features + ['bad_loans']].dropna()
        
        print("Transforming the data")
        self.mapper = self.make_mapper()
        X1 = self.mapper.fit_transform(clean_data)
        X2 = np.array(clean_data[self.numerical_cols])
        X = np.hstack((X1, X2))
        y = np.array(clean_data['bad_loans'])
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.33, random_state=100, stratify=y
        )
        
        print("Building the model")
        # Use RandomForest instead of LogisticRegression for better performance
        self.model = RandomForestClassifier(
            n_estimators=100, 
            random_state=42,
            class_weight='balanced'
        )
        self.model.fit(X_train, y_train)
        
        test_score = self.model.score(X_test, y_test)
        print(f"Test Score: {test_score}")
        
        # Create SHAP explainer
        self.explainer = shap.TreeExplainer(self.model)
        
        self.is_trained = True
        return test_score
    
    def _create_synthetic_data(self):
        """Create synthetic lending data for demo purposes"""
        np.random.seed(42)
        n_samples = 5000
        
        # Create realistic synthetic loan data
        data = {
            'grade': np.random.choice(['A', 'B', 'C', 'D', 'E', 'F', 'G'], n_samples),
            'sub_grade_num': np.random.uniform(0, 1, n_samples),
            'short_emp': np.random.choice([0, 1], n_samples, p=[0.7, 0.3]),
            'emp_length_num': np.random.randint(0, 10, n_samples),
            'home_ownership': np.random.choice(['RENT', 'OWN', 'MORTGAGE'], n_samples),
            'dti': np.random.uniform(0, 50, n_samples),
            'purpose': np.random.choice(['vacation', 'debt_consolidation', 'home_improvement', 'major_purchase'], n_samples),
            'payment_inc_ratio': np.random.uniform(0, 20, n_samples),
            'delinq_2yrs': np.random.poisson(0.5, n_samples),
            'delinq_2yrs_zero': np.random.choice([0, 1], n_samples, p=[0.3, 0.7]),
            'inq_last_6mths': np.random.poisson(2, n_samples),
            'last_delinq_none': np.random.choice([0, 1], n_samples, p=[0.2, 0.8]),
            'last_major_derog_none': np.random.choice([0, 1], n_samples, p=[0.1, 0.9]),
            'open_acc': np.random.poisson(8, n_samples),
            'pub_rec': np.random.poisson(0.2, n_samples),
            'pub_rec_zero': np.random.choice([0, 1], n_samples, p=[0.2, 0.8]),
            'revol_util': np.random.uniform(0, 100, n_samples),
        }
        
        df = pd.DataFrame(data)
        
        # Create realistic bad loan labels based on risk factors
        risk_score = (
            (df['dti'] > 30) * 0.3 +
            (df['delinq_2yrs'] > 0) * 0.4 +
            (df['revol_util'] > 80) * 0.2 +
            (df['grade'].isin(['F', 'G'])) * 0.3 +
            np.random.normal(0, 0.1, n_samples)
        )
        
        df['bad_loans'] = (risk_score > 0.4).astype(int)
        
        return df
    
    def explain_prediction(self, row):
        """Generate SHAP explanations for a prediction"""
        if self.explainer is None:
            raise ValueError("Model must be trained first")
            
        processed_row = self.preprocess(row)
        shap_values = self.explainer.shap_values(processed_row)
        
        # Return SHAP values for the positive class (bad loans)
        return shap_values[1][0] if len(shap_values) == 2 else shap_values[0]
    
    def save_model(self, model_path):
        """Save trained model"""
        if not self.is_trained:
            raise ValueError("No trained model to save")
            
        joblib.dump({
            'model': self.model,
            'mapper': self.mapper,
            'explainer': self.explainer,
            'features': self.features,
            'numerical_cols': self.numerical_cols,
            'categorical_cols': self.categorical_cols
        }, model_path)
        
        print(f"Model saved to {model_path}")
    
    def load_model(self, model_path):
        """Load trained model"""
        try:
            data = joblib.load(model_path)
            self.model = data['model']
            self.mapper = data['mapper']
            self.explainer = data.get('explainer')
            self.features = data.get('features', self.features)
            self.numerical_cols = data.get('numerical_cols', self.numerical_cols)
            self.categorical_cols = data.get('categorical_cols', self.categorical_cols)
            
            self.is_trained = True
            print("Model loaded successfully!")
            
        except Exception as e:
            print(f"Error loading model: {e}")
            raise

def create_sample_application():
    """Create sample loan application - same as test.py"""
    return {
        'delinq_2yrs': 0.0,
        'delinq_2yrs_zero': 1.0,
        'dti': 8.72,
        'emp_length_num': 0,
        'grade': 'F',
        'home_ownership': 'RENT',
        'inq_last_6mths': 3.0,
        'last_delinq_none': 1,
        'last_major_derog_none': 1,
        'open_acc': 2.0,
        'payment_inc_ratio': 4.5,
        'pub_rec': 0.0,
        'pub_rec_zero': 1.0,
        'purpose': 'vacation',
        'revol_util': 98.5,
        'short_emp': 0,
        'sub_grade_num': 1.0
    }

if __name__ == "__main__":
    # Test the model
    model = CreditScoringModel()
    print("Training model...")
    score = model.train_with_data()
    
    # Test prediction
    sample_app = create_sample_application()
    prediction = model.predict(sample_app)
    print(f"Sample prediction: {prediction:.4f}")
    
    # Save model
    model.save_model('../models/credit_model.pkl')
