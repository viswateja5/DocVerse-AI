import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# ==========================================
# Evaluation Metrics
# ==========================================

def get_mae(y_true, y_pred):
    return mean_absolute_error(y_true, y_pred)

def get_rmse(y_true, y_pred):
    return np.sqrt(mean_squared_error(y_true, y_pred))

def get_mape(y_true, y_pred):
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    mask = y_true != 0
    if not mask.any(): return 0.0
    return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100

def get_wape(y_true, y_pred):
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    sum_true = np.sum(np.abs(y_true))
    if sum_true == 0: return 0.0
    return (np.sum(np.abs(y_true - y_pred)) / sum_true) * 100

def get_smape(y_true, y_pred):
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    denominator = (np.abs(y_true) + np.abs(y_pred)) / 2.0
    mask = denominator != 0
    if not mask.any(): return 0.0
    return np.mean(np.abs(y_true[mask] - y_pred[mask]) / denominator[mask]) * 100

def get_r2(y_true, y_pred):
    if len(y_true) < 2: return 0.0
    return r2_score(y_true, y_pred)

def evaluate_all(y_true, y_pred):
    return {
        "MAE": get_mae(y_true, y_pred),
        "RMSE": get_rmse(y_true, y_pred),
        "MAPE": get_mape(y_true, y_pred),
        "WAPE": get_wape(y_true, y_pred),
        "SMAPE": get_smape(y_true, y_pred),
        "R2": get_r2(y_true, y_pred)
    }

# ==========================================
# Walk-Forward Validator
# ==========================================

class WalkForwardValidator:
    """
    Performs walk-forward validation for time series forecasting.
    Iteratively trains on a growing history and evaluates on the forecast horizon.
    """
    def __init__(self, min_train_size: int = 30, forecast_horizon: int = 7, step_size: int = 7):
        self.min_train_size = min_train_size
        self.forecast_horizon = forecast_horizon
        self.step_size = step_size
        
    def evaluate(self, model, y: pd.Series):
        """
        Evaluate a model on a series using walk-forward validation.
        Returns aggregated metrics across all splits.
        """
        y_array = y.values
        n = len(y_array)
        
        if n < self.min_train_size + self.forecast_horizon:
            # Not enough data for validation
            return None
            
        all_y_true = []
        all_y_pred = []
        
        # Slide window across the series
        for start_idx in range(self.min_train_size, n - self.forecast_horizon + 1, self.step_size):
            train = pd.Series(y_array[:start_idx])
            test = y_array[start_idx : start_idx + self.forecast_horizon]
            
            # Fit and Predict
            model.fit(train)
            preds = model.predict(self.forecast_horizon)
            
            all_y_true.extend(test)
            all_y_pred.extend(preds)
            
        if not all_y_true:
            return None
            
        # Return aggregated metrics
        return evaluate_all(all_y_true, all_y_pred)
