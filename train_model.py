#!/usr/bin/env python3
"""
Training script for the modernized credit scoring model
"""
import os
from src.ml.credit_model import CreditScoringModel

def main():
    print("🚀 Starting Credit Scoring Model Training")
    print("=" * 50)
    
    # Create models directory
    os.makedirs('models', exist_ok=True)
    
    # Initialize model
    model = CreditScoringModel()
    
    # Train model
    print("Training model with synthetic Lending Club data...")
    accuracy = model.train_with_data()
    
    print(f"✅ Model trained successfully!")
    print(f"📊 Accuracy: {accuracy:.4f}")
    
    # Save model
    model_path = 'models/credit_model.pkl'
    model.save_model(model_path)
    
    # Test with sample data
    print("\n🧪 Testing with sample application...")
    from src.ml.credit_model import create_sample_application
    
    sample_app = create_sample_application()
    prediction = model.predict(sample_app)
    
    print(f"Sample Application: Grade {sample_app['grade']}, DTI: {sample_app['dti']}")
    print(f"Default Probability: {prediction:.4f} ({prediction*100:.1f}%)")
    
    if prediction < 0.3:
        print("✅ Recommendation: APPROVE (Low Risk)")
    elif prediction < 0.7:
        print("⚠️  Recommendation: CONDITIONAL APPROVAL (Medium Risk)")
    else:
        print("❌ Recommendation: REJECT (High Risk)")
    
    print("\n🎉 Training completed! Model ready for API.")

if __name__ == "__main__":
    main()
