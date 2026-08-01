import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from catboost import CatBoostRegressor

class MLForecaster:
    """Wrapper for ML regression models to ensure standard interface for feature importance."""
    def __init__(self, model_type: str, **kwargs):
        self.model_type = model_type
        
        if model_type == 'RandomForest':
            self.model = RandomForestRegressor(**kwargs, random_state=42, n_jobs=-1)
        elif model_type == 'XGBoost':
            self.model = XGBRegressor(**kwargs, random_state=42, n_jobs=-1)
        elif model_type == 'CatBoost':
            self.model = CatBoostRegressor(**kwargs, random_state=42, verbose=False, thread_count=-1)
        else:
            raise ValueError(f"Unknown model_type: {model_type}")
            
    def fit(self, X, y):
        self.model.fit(X, y)
        return self
        
    def predict(self, X):
        return self.model.predict(X)
        
    def get_feature_importances(self):
        if self.model_type == 'CatBoost':
            return self.model.get_feature_importance()
        else:
            return self.model.feature_importances_
