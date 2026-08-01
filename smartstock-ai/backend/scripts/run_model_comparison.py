import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os
import sys

# Add backend directory to sys path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.ml.statistical_models import ProphetForecaster, ArimaForecaster, SarimaForecaster
from app.ml.baseline_models import MovingAverageForecaster
from app.ml.advanced_models import MLForecaster
from app.ml.evaluation import evaluate_all

def run_comparison():
    data_path = 'data/processed/train_processed.csv'
    output_dir = 'reports/final_comparison'
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Load Data
    print("Loading data...")
    df = pd.read_csv(data_path)
    df['Date'] = pd.to_datetime(df['Date'])
    
    # 2. Select a single time series for visual comparison (Store S001, Product P001)
    subset = df[(df['Store_ID_S001'] == 1) & (df['Product_ID_P001'] == 1)].sort_values('Date').reset_index(drop=True)
    store_id = "S001"
    product_id = "P001"
    print(f"Selected Store: {store_id}, Product: {product_id} with {len(subset)} rows.")
    
    # Simple Train-Test Split (Last 30 days for testing)
    train_size = len(subset) - 30
    train = subset.iloc[:train_size]
    test = subset.iloc[train_size:]
    
    X_train = train.drop(columns=['Date', 'Sales']).select_dtypes(include=[np.number])
    y_train = train['Sales']
    dates_train = train['Date']
    
    X_test = test.drop(columns=['Date', 'Sales']).select_dtypes(include=[np.number])
    y_test = test['Sales']
    dates_test = test['Date']
    
    # 3. Initialize Models
    models = {
        'ARIMA (1,1,1)': ArimaForecaster(order=(1,1,1)),
        'SARIMA (1,1,1)(1,1,1,7)': SarimaForecaster(order=(1,1,1), seasonal_order=(1,1,1,7)),
        'Moving Average (7d)': MovingAverageForecaster(window_size=7),
        'RandomForest': MLForecaster(model_type='RandomForest', n_estimators=100, max_depth=8),
        'XGBoost': MLForecaster(model_type='XGBoost', n_estimators=100, max_depth=6),
        'CatBoost': MLForecaster(model_type='CatBoost', iterations=100, depth=6)
    }
    
    results_metrics = []
    
    plt.figure(figsize=(14, 7))
    plt.plot(dates_test, y_test, label='Actual', color='black', linewidth=2)
    
    for name, model in models.items():
        print(f"Training {name}...")
        
        # Determine model type and fit
        if 'Prophet' in name or 'ARIMA' in name or 'SARIMA' in name:
            model.fit(X_train, y_train, dates_train)
            preds_df = model.predict(steps=30)
            preds = preds_df['yhat'].values
            
            # Plot Confidence Intervals for statistical models
            plt.fill_between(dates_test, preds_df['yhat_lower'], preds_df['yhat_upper'], alpha=0.1, label=f'{name} CI')
            
        elif 'Moving Average' in name:
            model.fit(y_train)
            preds = model.predict(steps=30)
            
        else: # ML Models
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            
        # Plot Forecast
        plt.plot(dates_test, preds, label=name, linestyle='--')
        
        # Calculate Metrics
        metrics = evaluate_all(y_test.values, preds)
        metrics['Model'] = name
        results_metrics.append(metrics)
        
        # Plot Residuals
        residuals = y_test.values - preds
        plt.figure(figsize=(8, 4))
        sns.histplot(residuals, kde=True, color='purple')
        plt.title(f'Residuals Distribution: {name}')
        plt.axvline(x=0, color='red', linestyle='--')
        plt.tight_layout()
        plt.savefig(f"{output_dir}/residuals_{name.replace(' ', '_').replace('(', '').replace(')', '').replace(',', '')}.png")
        plt.close()
        
    # Save main forecast plot
    plt.figure(1) # Go back to forecast plot
    plt.title(f'Forecast Comparison (Store {store_id}, Product {product_id})')
    plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
    plt.tight_layout()
    plt.savefig(f"{output_dir}/forecast_comparison.png")
    plt.close()
    
    # Compare and save metrics
    results_df = pd.DataFrame(results_metrics)
    cols = ['Model', 'MAE', 'RMSE', 'MAPE', 'WAPE', 'R2']
    results_df = results_df[cols]
    
    print("\nFinal Model Comparison:")
    print(results_df.to_string(index=False))
    
    results_df.to_csv(f"{output_dir}/model_comparison_metrics.csv", index=False)
    
    # Automatically select best model
    best_model = results_df.loc[results_df['RMSE'].idxmin()]['Model']
    print(f"\nBest Model Overall: {best_model}")
    
if __name__ == "__main__":
    run_comparison()
