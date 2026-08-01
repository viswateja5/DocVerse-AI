import optuna
import pandas as pd
import numpy as np
from app.ml.advanced_models import MLForecaster
from app.ml.evaluation import evaluate_all

class WalkForwardValidatorML:
    """
    Walk-forward validator for multivariate ML models.
    Assumes data is sorted chronologically.
    """
    def __init__(self, min_train_size: int = 1000, forecast_horizon: int = 100, step_size: int = 100):
        self.min_train_size = min_train_size
        self.forecast_horizon = forecast_horizon
        self.step_size = step_size
        
    def evaluate(self, model, X: pd.DataFrame, y: pd.Series):
        n = len(X)
        if n < self.min_train_size + self.forecast_horizon:
            return None
            
        all_y_true = []
        all_y_pred = []
        
        for start_idx in range(self.min_train_size, n - self.forecast_horizon + 1, self.step_size):
            X_train = X.iloc[:start_idx]
            y_train = y.iloc[:start_idx]
            
            X_test = X.iloc[start_idx : start_idx + self.forecast_horizon]
            y_test = y.iloc[start_idx : start_idx + self.forecast_horizon]
            
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            
            all_y_true.extend(y_test.values)
            all_y_pred.extend(preds)
            
        if not all_y_true:
            return None
            
        return evaluate_all(all_y_true, all_y_pred)

class OptunaTuner:
    """Hyperparameter tuner using Optuna and Walk-Forward Validation."""
    def __init__(self, model_type: str, n_trials: int = 10, metric: str = 'RMSE'):
        self.model_type = model_type
        self.n_trials = n_trials
        self.metric = metric
        
    def get_search_space(self, trial):
        if self.model_type == 'RandomForest':
            return {
                'n_estimators': trial.suggest_int('n_estimators', 50, 200),
                'max_depth': trial.suggest_int('max_depth', 3, 15),
                'min_samples_split': trial.suggest_int('min_samples_split', 2, 10)
            }
        elif self.model_type == 'XGBoost':
            return {
                'n_estimators': trial.suggest_int('n_estimators', 50, 200),
                'max_depth': trial.suggest_int('max_depth', 3, 10),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True)
            }
        elif self.model_type == 'CatBoost':
            return {
                'iterations': trial.suggest_int('iterations', 50, 200),
                'depth': trial.suggest_int('depth', 3, 10),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True)
            }

    def tune(self, X: pd.DataFrame, y: pd.Series, validator: WalkForwardValidatorML):
        
        def objective(trial):
            params = self.get_search_space(trial)
            model = MLForecaster(model_type=self.model_type, **params)
            metrics = validator.evaluate(model, X, y)
            
            if metrics is None:
                raise ValueError("Validation failed (not enough data).")
                
            return metrics[self.metric]
            
        study = optuna.create_study(direction='minimize')
        study.optimize(objective, n_trials=self.n_trials)
        
        return study.best_params, study.best_value
