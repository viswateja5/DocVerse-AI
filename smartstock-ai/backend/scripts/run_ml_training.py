import os
import sys

# Add backend directory to sys path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.ml.training_pipeline import ModelTrainer

def run_training():
    data_path = 'data/processed/train_processed.csv'
    output_dir = 'reports/ml_models'
    
    trainer = ModelTrainer(data_path=data_path, output_dir=output_dir)
    trainer.load_data()
    
    # We use fewer trials for demonstration speed. 
    # In production, n_trials=50 or 100.
    trainer.train_and_evaluate(
        models_to_tune=['RandomForest', 'XGBoost', 'CatBoost'], 
        n_trials=5
    )
    
    trainer.export_best_model()
    trainer.generate_dashboard()

if __name__ == "__main__":
    run_training()
