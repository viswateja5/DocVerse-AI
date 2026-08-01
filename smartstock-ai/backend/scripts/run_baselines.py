import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os
import sys

# Add backend directory to sys path so we can import app.ml
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.ml.baseline_models import MovingAverageForecaster, WeightedMovingAverageForecaster, SeasonalNaiveForecaster, ExponentialSmoothingForecaster
from app.ml.evaluation import WalkForwardValidator

def run_baselines(data_path='data/raw/mock_sales_data.csv', output_dir='reports/baselines'):
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Loading data from {data_path}...")
    df = pd.read_csv(data_path)
    df['Date'] = pd.to_datetime(df['Date'])
    
    # We will evaluate baselines on a subset of Series to save time
    # (e.g. 3 random store-product combinations)
    series_keys = df[['Store_ID', 'Product_ID']].drop_duplicates().values
    
    # Instantiate models
    models = {
        'Moving Average (7d)': MovingAverageForecaster(window_size=7),
        'Weighted Moving Average (7d)': WeightedMovingAverageForecaster(window_size=7),
        'Seasonal Naive (7d)': SeasonalNaiveForecaster(season_length=7),
        'Exponential Smoothing': ExponentialSmoothingForecaster(seasonal_periods=7, trend='add', seasonal='add')
    }
    
    validator = WalkForwardValidator(min_train_size=60, forecast_horizon=7, step_size=7)
    
    results = []
    
    print("Running Walk-Forward Validation across models...")
    for model_name, model in models.items():
        print(f"Evaluating {model_name}...")
        
        model_metrics = []
        # Iterate over all specific time series
        for store_id, product_id in series_keys:
            subset = df[(df['Store_ID'] == store_id) & (df['Product_ID'] == product_id)]
            subset = subset.sort_values('Date')
            
            # Use Sales column for univariate forecasting
            y = subset['Sales']
            
            # Evaluate using Walk-Forward
            metrics = validator.evaluate(model, y)
            if metrics:
                model_metrics.append(metrics)
                
        # Aggregate metrics for the model
        if model_metrics:
            agg_metrics = {k: np.mean([m[k] for m in model_metrics]) for k in model_metrics[0].keys()}
            agg_metrics['Model'] = model_name
            results.append(agg_metrics)
            
    # Save results to DataFrame
    results_df = pd.DataFrame(results)
    
    # Reorder columns
    cols = ['Model', 'MAE', 'RMSE', 'MAPE', 'WAPE', 'SMAPE', 'R2']
    results_df = results_df[cols]
    
    print("\nAggregate Baseline Results:")
    print(results_df)
    
    metrics_path = f"{output_dir}/baseline_metrics.csv"
    results_df.to_csv(metrics_path, index=False)
    print(f"Saved metrics to {metrics_path}")
    
    # Generate Comparison Charts
    print("Generating comparison charts...")
    sns.set_theme(style="whitegrid")
    
    metrics_to_plot = ['MAE', 'RMSE', 'MAPE']
    for metric in metrics_to_plot:
        plt.figure(figsize=(10, 6))
        ax = sns.barplot(data=results_df, x='Model', y=metric, palette='viridis')
        plt.title(f'Baseline Model Comparison: {metric}')
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        plt.savefig(f"{output_dir}/compare_{metric.lower()}.png")
        plt.close()
        
    print(f"Saved comparison charts to {output_dir}")

if __name__ == "__main__":
    run_baselines()
