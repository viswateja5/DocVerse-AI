import pandas as pd
import numpy as np
from prophet import Prophet
import statsmodels.api as sm
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
import warnings
import logging

warnings.filterwarnings('ignore')
logging.getLogger('cmdstanpy').setLevel(logging.ERROR)

class StatisticalForecaster:
    def __init__(self):
        self.fitted = False
        
    def fit(self, X: pd.DataFrame, y: pd.Series, dates: pd.Series):
        pass
        
    def predict(self, steps: int) -> pd.DataFrame:
        """Returns DataFrame with 'yhat', 'yhat_lower', 'yhat_upper'"""
        pass

class ProphetForecaster(StatisticalForecaster):
    def __init__(self):
        super().__init__()
        self.model = Prophet(yearly_seasonality=False, weekly_seasonality=True, daily_seasonality=False)
        
    def fit(self, X: pd.DataFrame, y: pd.Series, dates: pd.Series):
        # Prophet expects 'ds' and 'y'
        df = pd.DataFrame({'ds': dates.values, 'y': y.values})
        self.model.fit(df)
        self.fitted = True
        return self
        
    def predict(self, steps: int) -> pd.DataFrame:
        future = self.model.make_future_dataframe(periods=steps, include_history=False)
        forecast = self.model.predict(future)
        return forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]


class ArimaForecaster(StatisticalForecaster):
    def __init__(self, order=(1, 1, 1)):
        super().__init__()
        self.order = order
        self.model_fit = None
        
    def fit(self, X: pd.DataFrame, y: pd.Series, dates: pd.Series):
        # Ensure we have continuous index for statsmodels
        endog = y.values
        model = ARIMA(endog, order=self.order)
        self.model_fit = model.fit()
        self.fitted = True
        return self
        
    def predict(self, steps: int) -> pd.DataFrame:
        forecast_obj = self.model_fit.get_forecast(steps=steps)
        yhat = forecast_obj.predicted_mean
        conf_int = forecast_obj.conf_int(alpha=0.05)
        
        return pd.DataFrame({
            'yhat': yhat,
            'yhat_lower': conf_int[:, 0],
            'yhat_upper': conf_int[:, 1]
        })


class SarimaForecaster(StatisticalForecaster):
    def __init__(self, order=(1, 1, 1), seasonal_order=(1, 1, 1, 7)):
        super().__init__()
        self.order = order
        self.seasonal_order = seasonal_order
        self.model_fit = None
        
    def fit(self, X: pd.DataFrame, y: pd.Series, dates: pd.Series):
        endog = y.values
        model = SARIMAX(endog, order=self.order, seasonal_order=self.seasonal_order, enforce_stationarity=False, enforce_invertibility=False)
        self.model_fit = model.fit(disp=False)
        self.fitted = True
        return self
        
    def predict(self, steps: int) -> pd.DataFrame:
        forecast_obj = self.model_fit.get_forecast(steps=steps)
        yhat = forecast_obj.predicted_mean
        conf_int = forecast_obj.conf_int(alpha=0.05)
        
        return pd.DataFrame({
            'yhat': yhat,
            'yhat_lower': conf_int[:, 0],
            'yhat_upper': conf_int[:, 1]
        })
