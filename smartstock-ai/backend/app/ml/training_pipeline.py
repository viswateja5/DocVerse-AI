import pandas as pd
import numpy as np
import joblib
import os
import matplotlib.pyplot as plt
import seaborn as sns

from app.ml.advanced_models import MLForecaster
from app.ml.tuning import OptunaTuner, WalkForwardValidatorML

class ModelTrainer:
    def __init__(self, data_path: str, output_dir: str):
        self.data_path = data_path
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        self.results = {}
        self.best_model_name = None
        self.best_model_instance = None
        self.best_metric_value = float('inf')
        
    def load_data(self):
        print(f"Loading processed data from {self.data_path}...")
        df = pd.read_csv(self.data_path)
        # Assuming date is present for sorting
        if 'Date' in df.columns:
            df['Date'] = pd.to_datetime(df['Date'])
            df = df.sort_values('Date').reset_index(drop=True)
            self.X = df.drop(columns=['Date', 'Sales'])
        else:
            self.X = df.drop(columns=['Sales'])
        self.y = df['Sales']
        
        # Ensure only numeric cols (OHE was done in preprocessing)
        self.X = self.X.select_dtypes(include=[np.number])
        
    def train_and_evaluate(self, models_to_tune=['RandomForest', 'XGBoost', 'LightGBM', 'CatBoost'], n_trials=5):
        validator = WalkForwardValidatorML(min_train_size=1000, forecast_horizon=100, step_size=200)
        
        # Chronological Split: 80% Train/Tune, 20% Hold-out Test
        split_idx = int(len(self.X) * 0.8)
        X_train_tune, y_train_tune = self.X.iloc[:split_idx], self.y.iloc[:split_idx]
        X_holdout, y_holdout = self.X.iloc[split_idx:], self.y.iloc[split_idx:]
        
        for model_name in models_to_tune:
            print(f"\n--- Tuning {model_name} on 80% Training Set ---")
            tuner = OptunaTuner(model_type=model_name, n_trials=n_trials, metric='RMSE')
            best_params, best_score = tuner.tune(X_train_tune, y_train_tune, validator)
            
            print(f"Best params for {model_name}: {best_params}")
            print(f"Validation RMSE (Walk-Forward on 80%): {best_score}")
            
            # Retrain on full 80% tuning set
            final_model = MLForecaster(model_type=model_name, **best_params)
            final_model.fit(X_train_tune, y_train_tune)
            
            # Evaluate strictly on unseen 20% Hold-Out Set
            print(f"Evaluating {model_name} on 20% Unseen Hold-Out Set...")
            from app.ml.evaluation import evaluate_all
            preds = final_model.predict(X_holdout)
            metrics = evaluate_all(y_holdout.values, preds)
            
            self.results[model_name] = metrics
            self.save_feature_importance(final_model, model_name)
            
            if metrics['RMSE'] < self.best_metric_value:
                self.best_metric_value = metrics['RMSE']
                self.best_model_name = model_name
                # Before exporting, retrain on 100% of the data with best params for maximum predictive power
                self.best_model_instance = MLForecaster(model_type=model_name, **best_params)
                self.best_model_instance.fit(self.X, self.y)
                
    def save_feature_importance(self, model, model_name):
        importances = model.get_feature_importances()
        features = self.X.columns
        
        fi_df = pd.DataFrame({'Feature': features, 'Importance': importances})
        fi_df = fi_df.sort_values(by='Importance', ascending=False).head(15)
        
        plt.figure(figsize=(10, 8))
        sns.barplot(data=fi_df, x='Importance', y='Feature', palette='viridis')
        plt.title(f'Feature Importance: {model_name}')
        plt.tight_layout()
        plt.savefig(f"{self.output_dir}/{model_name}_feature_importance.png")
        plt.close()
        
    def export_best_model(self):
        print(f"\nBest Model Overall: {self.best_model_name} with RMSE = {self.best_metric_value:.4f}")
        model_path = os.path.join(self.output_dir, 'best_forecaster.joblib')
        joblib.dump(self.best_model_instance.model, model_path)
        print(f"Exported best model to {model_path}")
        
    def generate_dashboard(self):
        metrics_df = pd.DataFrame(self.results).T.reset_index().rename(columns={'index': 'Model'})
        metrics_df.to_csv(f"{self.output_dir}/ml_models_metrics.csv", index=False)
        
        print("\nFinal Metrics Comparison:")
        print(metrics_df[['Model', 'MAE', 'RMSE', 'MAPE', 'R2']])
        
        metrics_to_plot = ['MAE', 'RMSE', 'MAPE']
        for metric in metrics_to_plot:
            plt.figure(figsize=(10, 6))
            sns.barplot(data=metrics_df, x='Model', y=metric, palette='mako')
            plt.title(f'ML Model Comparison: {metric}')
            plt.xticks(rotation=45)
            plt.tight_layout()
            plt.savefig(f"{self.output_dir}/compare_{metric.lower()}.png")
            plt.close()
