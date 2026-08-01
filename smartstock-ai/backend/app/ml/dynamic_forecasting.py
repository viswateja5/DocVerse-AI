import os
from functools import lru_cache
import json
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_percentage_error, mean_squared_error
import joblib
import holidays
import shap
from statsmodels.tsa.seasonal import seasonal_decompose

# Models
from prophet import Prophet
from sklearn.ensemble import RandomForestRegressor
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.holtwinters import ExponentialSmoothing
import xgboost as xgb
import lightgbm as lgb
import catboost as cb

UPLOAD_DIR = os.path.join(os.getcwd(), "data", "uploads")

def load_data_and_schema(storage_path: str):
    ext = storage_path.split('.')[-1].lower()
    full_path = os.path.join(UPLOAD_DIR, storage_path)
    
    if ext == 'csv':
        df = pd.read_csv(full_path)
    elif ext == 'xlsx':
        df = pd.read_excel(full_path)
    elif ext == 'parquet':
        df = pd.read_parquet(full_path)
        
    base_name = storage_path.rsplit('.', 1)[0]
    schema_path = os.path.join(UPLOAD_DIR, f"{base_name}_schema.json")
    
    with open(schema_path, "r") as f:
        schema = json.load(f)
        
    date_col = next(c["name"] for c in schema if c["role"] == "date")
    target_col = next(c["name"] for c in schema if c["role"] == "target")
    
    df[date_col] = pd.to_datetime(df[date_col], format='mixed', errors='coerce')
    df = df.dropna(subset=[date_col, target_col]).sort_values(date_col).reset_index(drop=True)
    
    return df, date_col, target_col

def create_features(df, date_col, target_col):
    df_feat = df.copy()
    df_feat[target_col] = df_feat[target_col].interpolate(method='linear').bfill().ffill()
    
    df_feat['month'] = df_feat[date_col].dt.month
    df_feat['quarter'] = df_feat[date_col].dt.quarter
    df_feat['week'] = df_feat[date_col].dt.isocalendar().week.astype(int)
    df_feat['year'] = df_feat[date_col].dt.year
    df_feat['dayofweek'] = df_feat[date_col].dt.dayofweek
    df_feat['is_weekend'] = df_feat['dayofweek'].isin([5, 6]).astype(int)
    
    us_holidays = holidays.US()
    df_feat['is_holiday'] = df_feat[date_col].apply(lambda x: int(x in us_holidays))
    
    df_feat['trend'] = np.arange(len(df_feat))
    df_feat['sin_year'] = np.sin(2 * np.pi * df_feat['trend'] / 365.25)
    df_feat['cos_year'] = np.cos(2 * np.pi * df_feat['trend'] / 365.25)
    
    for lag in [1, 7, 30]:
        df_feat[f'lag_{lag}'] = df_feat[target_col].shift(lag)
        
    shifted_target = df_feat[target_col].shift(1)
    for window in [7, 30]:
        df_feat[f'rolling_mean_{window}'] = shifted_target.rolling(window=window).mean()
        df_feat[f'rolling_median_{window}'] = shifted_target.rolling(window=window).median()
        df_feat[f'rolling_std_{window}'] = shifted_target.rolling(window=window).std()
    
    df_feat = df_feat.dropna().reset_index(drop=True)
    return df_feat

def evaluate_model(y_true, y_pred):
    return {
        "mape": round(mean_absolute_percentage_error(y_true, y_pred) * 100, 2),
        "rmse": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 2)
    }

def train_prophet(df, date_col, target_col, train_size, horizon):
    pdf = df[[date_col, target_col]].rename(columns={date_col: 'ds', target_col: 'y'})
    train = pdf.iloc[:train_size]
    test = pdf.iloc[train_size:]
    
    model = Prophet()
    model.fit(train)
    
    # Evaluate on test
    future_test = model.make_future_dataframe(periods=len(test))
    forecast_test = model.predict(future_test)
    preds = forecast_test.iloc[train_size:]['yhat'].values
    metrics = evaluate_model(test['y'].values, preds)
    
    # Generate actual future forecast
    model_full = Prophet()
    model_full.fit(pdf)
    future_full = model_full.make_future_dataframe(periods=horizon)
    forecast_full = model_full.predict(future_full)
    
    future_df = forecast_full.tail(horizon)
    
    return metrics, model_full, {
        "forecast_dates": future_df['ds'].astype(str).tolist(),
        "forecast_values": future_df['yhat'].tolist(),
        "ci_lower": future_df['yhat_lower'].tolist(),
        "ci_upper": future_df['yhat_upper'].tolist(),
        "test_actual": test['y'].tolist(),
        "test_predicted": preds.tolist(),
        "feature_importance": {},
        "shap_values": {}
    }

def train_arima(df, target_col, train_size, horizon):
    series = df[target_col].values
    train, test = series[:train_size], series[train_size:]
    
    model = ARIMA(train, order=(1,1,1))
    model_fit = model.fit()
    preds = model_fit.forecast(steps=len(test))
    metrics = evaluate_model(test, preds)
    
    model_full = ARIMA(series, order=(1,1,1)).fit()
    forecast_res = model_full.get_forecast(steps=horizon)
    
    return metrics, model_full, {
        "forecast_values": forecast_res.predicted_mean.tolist(),
        "ci_lower": forecast_res.conf_int()[:, 0].tolist(),
        "ci_upper": forecast_res.conf_int()[:, 1].tolist(),
        "test_actual": test.tolist(),
        "test_predicted": preds.tolist(),
        "feature_importance": {},
        "shap_values": {}
    }

def train_sarima(df, target_col, train_size, horizon):
    series = df[target_col].values
    train, test = series[:train_size], series[train_size:]
    
    model = SARIMAX(train, order=(1, 1, 1), seasonal_order=(1, 1, 1, 7))
    model_fit = model.fit(disp=False)
    preds = model_fit.forecast(steps=len(test))
    metrics = evaluate_model(test, preds)
    
    model_full = SARIMAX(series, order=(1, 1, 1), seasonal_order=(1, 1, 1, 7)).fit(disp=False)
    forecast_res = model_full.get_forecast(steps=horizon)
    
    return metrics, model_full, {
        "forecast_values": forecast_res.predicted_mean.tolist(),
        "ci_lower": forecast_res.conf_int()[:, 0].tolist(),
        "ci_upper": forecast_res.conf_int()[:, 1].tolist(),
        "test_actual": test.tolist(),
        "test_predicted": preds.tolist(),
        "feature_importance": {},
        "shap_values": {}
    }

def train_moving_average(df, target_col, train_size, horizon):
    series = df[target_col].values
    train, test = series[:train_size], series[train_size:]
    
    window = 7
    last_val = np.mean(train[-window:])
    preds = np.full(len(test), last_val)
    metrics = evaluate_model(test, preds)
    
    last_val_full = np.mean(series[-window:])
    forecast_values = np.full(horizon, last_val_full).tolist()
    
    return metrics, None, {
        "forecast_values": forecast_values,
        "ci_lower": [v * 0.9 for v in forecast_values],
        "ci_upper": [v * 1.1 for v in forecast_values],
        "test_actual": test.tolist(),
        "test_predicted": preds.tolist(),
        "feature_importance": {},
        "shap_values": {}
    }

def train_exponential_smoothing(df, target_col, train_size, horizon):
    series = df[target_col].values
    train, test = series[:train_size], series[train_size:]
    
    model = ExponentialSmoothing(train, trend='add', seasonal='add', seasonal_periods=7)
    model_fit = model.fit()
    preds = model_fit.forecast(len(test))
    metrics = evaluate_model(test, preds)
    
    model_full = ExponentialSmoothing(series, trend='add', seasonal='add', seasonal_periods=7).fit()
    forecast_values = model_full.forecast(horizon)
    
    return metrics, model_full, {
        "forecast_values": forecast_values.tolist(),
        "ci_lower": [v * 0.9 for v in forecast_values],
        "ci_upper": [v * 1.1 for v in forecast_values],
        "test_actual": test.tolist(),
        "test_predicted": preds.tolist(),
        "feature_importance": {},
        "shap_values": {}
    }

def train_tree_model(df_feat, target_col, date_col, train_size, model_type, horizon):
    features = [c for c in df_feat.columns if c not in [date_col, target_col]]
    
    train = df_feat.iloc[:train_size]
    test = df_feat.iloc[train_size:]
    
    X_train, y_train = train[features], train[target_col]
    X_test, y_test = test[features], test[target_col]
    
    if model_type == 'xgboost':
        model = xgb.XGBRegressor(n_estimators=100)
    elif model_type == 'lightgbm':
        model = lgb.LGBMRegressor(n_estimators=100, verbose=-1)
    elif model_type == 'catboost':
        model = cb.CatBoostRegressor(iterations=100, verbose=0)
    else:
        model = RandomForestRegressor(n_estimators=100)
        
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    metrics = evaluate_model(y_test, preds)
    
    # Global Feature Importance
    importance_dict = {}
    if hasattr(model, 'feature_importances_'):
        imp = model.feature_importances_
        importance_dict = {f: float(i) for f, i in zip(features, imp)}
        
    # SHAP values (on a sample of test data to be fast)
    shap_dict = {}
    try:
        sample = X_test.sample(min(100, len(X_test)))
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(sample)
        if isinstance(shap_values, list): # For some versions of SHAP/models
            shap_values = shap_values[0]
        mean_abs_shap = np.abs(shap_values).mean(axis=0)
        shap_dict = {f: float(i) for f, i in zip(features, mean_abs_shap)}
    except Exception as e:
        print("SHAP failed:", e)
    
    # Train full model for future forecast
    model_full = model.__class__(**model.get_params())
    X_full, y_full = df_feat[features], df_feat[target_col]
    model_full.fit(X_full, y_full)
    
    # Simulate future features naively (propagate last known features forward)
    last_row = X_full.iloc[-1:].copy()
    future_X = pd.concat([last_row]*horizon, ignore_index=True)
    future_X['trend'] = future_X['trend'] + np.arange(1, horizon+1)
    future_preds = model_full.predict(future_X)
    
    # Residual std for CI
    std_resid = np.std(y_test - preds)
    
    return metrics, model_full, {
        "forecast_values": future_preds.tolist(),
        "ci_lower": (future_preds - 1.96 * std_resid).tolist(),
        "ci_upper": (future_preds + 1.96 * std_resid).tolist(),
        "test_actual": y_test.tolist(),
        "test_predicted": preds.tolist(),
        "feature_importance": importance_dict,
        "shap_values": shap_dict
    }


def generate_insights(payload, df, target_col):
    insights = []
    
    # 1. Demand Trend
    trend = payload.get('historical_trend', [])
    if trend and len(trend) > 10:
        start_trend = np.nanmean(trend[:max(5, len(trend)//10)])
        end_trend = np.nanmean(trend[-max(5, len(trend)//10):])
        
        if end_trend > start_trend * 1.05:
            insights.append({"title": "Demand Increase", "description": "The overall demand is experiencing a sustained upward trend, indicating growing market interest.", "type": "positive", "icon": "TrendingUp"})
        elif end_trend < start_trend * 0.95:
            insights.append({"title": "Demand Decrease", "description": "Demand is currently trending downwards. Consider reviewing marketing or pricing strategies.", "type": "negative", "icon": "TrendingDown"})

    # 2. Seasonality
    seasonality = payload.get('historical_seasonality', [])
    if seasonality:
        amplitude = np.nanmax(seasonality) - np.nanmin(seasonality)
        mean_val = np.nanmean(df[target_col])
        if amplitude > (mean_val * 0.1):
            insights.append({"title": "Strong Seasonality", "description": "This dataset exhibits strong recurring seasonal patterns that significantly influence demand.", "type": "info", "icon": "Calendar"})

    # 3. Feature Impact (Holidays/Promotions)
    shap_vals = payload.get('shap_values', {})
    if shap_vals:
        sorted_shap = sorted(shap_vals.items(), key=lambda x: x[1], reverse=True)
        if sorted_shap:
            top_feature, top_impact = sorted_shap[0]
            if 'holiday' in top_feature.lower():
                insights.append({"title": "Holiday Impact", "description": "Holidays are the primary driver of demand fluctuations in this dataset.", "type": "info", "icon": "Gift"})
            if 'promo' in top_feature.lower():
                insights.append({"title": "Promotion Impact", "description": "Promotional events strongly correlate with demand spikes.", "type": "positive", "icon": "Tag"})
            if 'weekend' in top_feature.lower():
                insights.append({"title": "Weekend Impact", "description": "Weekends heavily influence the sales volume.", "type": "info", "icon": "Calendar"})

    # 4. Forecast Confidence
    metrics = payload.get('metrics', {})
    mape = metrics.get('mape', 100)
    if mape < 15:
        insights.append({"title": "High Confidence", "description": f"The AI model is highly confident in its predictions with a historic error rate of only {mape}%.", "type": "positive", "icon": "ShieldCheck"})
    elif mape > 30:
        insights.append({"title": "Low Confidence", "description": f"The forecast carries higher uncertainty (MAPE {mape}%). Use these predictions cautiously.", "type": "warning", "icon": "AlertTriangle"})

    if not insights:
        insights.append({"title": "Stable Baseline", "description": "The dataset is relatively stable with no extreme outliers or aggressive trends detected.", "type": "info", "icon": "Activity"})

    return insights

@lru_cache(maxsize=32)
def run_pipeline(storage_path: str, model_type: str, horizon: int):
    df, date_col, target_col = load_data_and_schema(storage_path)
    
    if len(df) > 5000:
        df = df.tail(5000).reset_index(drop=True)
        
    df_feat = create_features(df, date_col, target_col)
    train_size_feat = int(len(df_feat) * 0.8)
    train_size_raw = int(len(df) * 0.8)
    
    results = {}
    models_to_test = [
        'moving_average', 'exponential_smoothing', 'arima', 'sarima', 
        'prophet', 'xgboost', 'lightgbm', 'catboost', 'random_forest'
    ] if model_type == 'automl' else [model_type]
    
    for m in models_to_test:
        try:
            if m == 'moving_average':
                metrics, _, payload = train_moving_average(df, target_col, train_size_raw, horizon)
            elif m == 'exponential_smoothing':
                metrics, _, payload = train_exponential_smoothing(df, target_col, train_size_raw, horizon)
            elif m == 'prophet':
                metrics, _, payload = train_prophet(df, date_col, target_col, train_size_raw, horizon)
            elif m == 'arima':
                metrics, _, payload = train_arima(df, target_col, train_size_raw, horizon)
            elif m == 'sarima':
                metrics, _, payload = train_sarima(df, target_col, train_size_raw, horizon)
            elif m in ['xgboost', 'lightgbm', 'catboost', 'random_forest']:
                metrics, _, payload = train_tree_model(df_feat, target_col, date_col, train_size_feat, m, horizon)
            else:
                continue
            
            payload['metrics'] = metrics
            results[m] = payload
        except Exception as e:
            print(f"Model {m} failed: {e}")
            
    if not results:
        raise ValueError("All models failed to train.")
        
    best_model_name = min(results, key=lambda k: results[k]['metrics']['mape'])
    best_payload = results[best_model_name]
    
    # Time-series decomposition for the historical data
    try:
        decomp = seasonal_decompose(df[target_col].interpolate().bfill().ffill(), period=7, extrapolate_trend='freq')
        best_payload['historical_trend'] = decomp.trend.tolist()
        best_payload['historical_seasonality'] = decomp.seasonal.tolist()
    except:
        best_payload['historical_trend'] = []
        best_payload['historical_seasonality'] = []
        
    # Historical basic data (downsampled for UI if needed)
    downsample_step = max(1, len(df) // 365)
    hist_df = df.iloc[::downsample_step]
    
    # Add generated dates for forecast if missing
    last_date = df[date_col].iloc[-1]
    forecast_dates = [ (last_date + pd.Timedelta(days=i)).strftime('%Y-%m-%d') for i in range(1, horizon+1) ]
    
    if 'forecast_dates' not in best_payload or not best_payload['forecast_dates']:
        best_payload['forecast_dates'] = forecast_dates
        
    return {
        "status": "success",
        "champion_model": best_model_name,
        "metrics": best_payload['metrics'],
                "analytics": {
            "insights": generate_insights(best_payload, df, target_col),
            "historical_dates": hist_df[date_col].dt.strftime('%Y-%m-%d').tolist(),
            "historical_actuals": hist_df[target_col].tolist(),
            "historical_trend": best_payload['historical_trend'][::downsample_step],
            "historical_seasonality": best_payload['historical_seasonality'][::downsample_step],
            "forecast_dates": best_payload['forecast_dates'],
            "forecast_values": best_payload['forecast_values'],
            "ci_lower": best_payload['ci_lower'],
            "ci_upper": best_payload['ci_upper'],
            "test_actual": best_payload['test_actual'],
            "test_predicted": best_payload['test_predicted'],
            "feature_importance": best_payload['feature_importance'],
            "shap_values": best_payload['shap_values']
        }
    }
