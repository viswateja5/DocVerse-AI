from abc import ABC, abstractmethod
import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing

class BaseForecaster(ABC):
    """
    Abstract base class for all forecasting models.
    """
    def __init__(self):
        self.fitted = False
        
    @abstractmethod
    def fit(self, y: pd.Series):
        pass
        
    @abstractmethod
    def predict(self, steps: int) -> np.ndarray:
        pass


class MovingAverageForecaster(BaseForecaster):
    """Simple Moving Average Forecaster."""
    def __init__(self, window_size: int = 7):
        super().__init__()
        self.window_size = window_size
        self.history = None
        
    def fit(self, y: pd.Series):
        self.history = y.values
        self.fitted = True
        return self
        
    def predict(self, steps: int) -> np.ndarray:
        if not self.fitted:
            raise ValueError("Model must be fitted before predicting.")
            
        preds = []
        current_history = list(self.history[-self.window_size:])
        for _ in range(steps):
            pred = np.mean(current_history[-self.window_size:])
            preds.append(pred)
            current_history.append(pred) # Append prediction to history for next step
        return np.array(preds)


class WeightedMovingAverageForecaster(BaseForecaster):
    """Weighted Moving Average Forecaster. Gives more weight to recent observations."""
    def __init__(self, window_size: int = 7):
        super().__init__()
        self.window_size = window_size
        # Weights: linear increase, e.g. [1, 2, 3, 4, 5, 6, 7] normalized
        weights = np.arange(1, window_size + 1)
        self.weights = weights / weights.sum()
        self.history = None
        
    def fit(self, y: pd.Series):
        self.history = y.values
        self.fitted = True
        return self
        
    def predict(self, steps: int) -> np.ndarray:
        if not self.fitted:
            raise ValueError("Model must be fitted before predicting.")
            
        preds = []
        current_history = list(self.history[-self.window_size:])
        for _ in range(steps):
            window_vals = np.array(current_history[-self.window_size:])
            pred = np.sum(window_vals * self.weights)
            preds.append(pred)
            current_history.append(pred)
        return np.array(preds)


class SeasonalNaiveForecaster(BaseForecaster):
    """Seasonal Naive Forecaster. Predicts the value from 'season_length' periods ago."""
    def __init__(self, season_length: int = 7):
        super().__init__()
        self.season_length = season_length
        self.history = None
        
    def fit(self, y: pd.Series):
        self.history = y.values
        self.fitted = True
        return self
        
    def predict(self, steps: int) -> np.ndarray:
        if not self.fitted:
            raise ValueError("Model must be fitted before predicting.")
            
        preds = []
        current_history = list(self.history)
        for i in range(steps):
            # The prediction is exactly the value 'season_length' steps prior
            pred = current_history[-self.season_length]
            preds.append(pred)
            current_history.append(pred)
        return np.array(preds)


class ExponentialSmoothingForecaster(BaseForecaster):
    """Wrapper for statsmodels ExponentialSmoothing (Holt-Winters)."""
    def __init__(self, seasonal_periods: int = 7, trend='add', seasonal='add'):
        super().__init__()
        self.seasonal_periods = seasonal_periods
        self.trend = trend
        self.seasonal = seasonal
        self.model_fit = None
        
    def fit(self, y: pd.Series):
        # Statsmodels requires strictly positive data for multiplicative models. 
        # We ensure no negative/zero values if multiplicative.
        data = y.values
        if self.trend == 'mul' or self.seasonal == 'mul':
            data = np.where(data <= 0, 1e-4, data)
            
        # If history is too short for the seasonal period, fallback to simple MA
        if len(data) >= 2 * self.seasonal_periods:
            model = ExponentialSmoothing(
                data, 
                trend=self.trend, 
                seasonal=self.seasonal, 
                seasonal_periods=self.seasonal_periods,
                initialization_method="estimated"
            )
            self.model_fit = model.fit(optimized=True)
        else:
            self.model_fit = None
            self.fallback_history = data
            
        self.fitted = True
        return self
        
    def predict(self, steps: int) -> np.ndarray:
        if not self.fitted:
            raise ValueError("Model must be fitted before predicting.")
            
        if self.model_fit is not None:
            preds = self.model_fit.forecast(steps)
            return np.maximum(preds, 0) # Prevent negative forecasts
        else:
            # Fallback to naive mean if history was too short
            mean_val = np.mean(self.fallback_history) if len(self.fallback_history) > 0 else 0
            return np.full(steps, mean_val)
