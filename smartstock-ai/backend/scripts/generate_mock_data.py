import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

def generate_mock_data(num_days=365, num_stores=3, num_products=5, missing_rate=0.05, outlier_rate=0.02):
    np.random.seed(42)
    
    start_date = datetime(2023, 1, 1)
    date_range = [start_date + timedelta(days=i) for i in range(num_days)]
    
    data = []
    
    categories = ['Electronics', 'Clothing', 'Food', 'Home', 'Toys']
    product_categories = {f'P{i:03d}': categories[i % len(categories)] for i in range(1, num_products + 1)}
    
    for date in date_range:
        for store_id in range(1, num_stores + 1):
            for product_id in range(1, num_products + 1):
                p_id = f'P{product_id:03d}'
                s_id = f'S{store_id:03d}'
                category = product_categories[p_id]
                
                # Base features
                price = round(np.random.uniform(10, 500), 2)
                cost = round(price * np.random.uniform(0.4, 0.8), 2)
                
                # Demand factors
                is_weekend = 1 if date.weekday() >= 5 else 0
                holiday = 1 if np.random.random() < 0.05 else 0
                promotion = 1 if np.random.random() < 0.1 else 0
                discount = round(np.random.uniform(0.05, 0.3), 2) if promotion else 0.0
                
                temperature = round(np.random.normal(20, 10), 1)
                rainfall = round(max(0, np.random.normal(2, 5)), 1)
                
                # Sales & Inventory
                base_sales = np.random.poisson(20)
                sales = int(base_sales * (1 + 0.5 * promotion) * (1 + 0.2 * holiday) * (1 + 0.1 * is_weekend))
                
                inventory = int(np.random.normal(100, 20))
                if sales > inventory:
                    sales = inventory  # Can't sell what we don't have
                
                profit = round((price * (1 - discount) - cost) * sales, 2)
                
                # Supplier info
                supplier_lead_time = np.random.randint(1, 14)
                supplier_reliability = round(np.random.uniform(0.7, 1.0), 2)
                
                row = {
                    'Date': date,
                    'Store_ID': s_id,
                    'Product_ID': p_id,
                    'Category': category,
                    'Sales': sales,
                    'Inventory': inventory,
                    'Price': price,
                    'Promotion': promotion,
                    'Holiday': holiday,
                    'Temperature': temperature,
                    'Rainfall': rainfall,
                    'Discount': discount,
                    'Supplier_Lead_Time': supplier_lead_time,
                    'Supplier_Reliability': supplier_reliability,
                    'Cost': cost,
                    'Profit': profit
                }
                data.append(row)
                
    df = pd.DataFrame(data)
    
    # Introduce missing values
    for col in ['Temperature', 'Rainfall', 'Supplier_Reliability']:
        mask = np.random.random(len(df)) < missing_rate
        df.loc[mask, col] = np.nan
        
    # Introduce outliers in Sales
    outlier_mask = np.random.random(len(df)) < outlier_rate
    df.loc[outlier_mask, 'Sales'] = df.loc[outlier_mask, 'Sales'] * 5
    
    # Introduce duplicates
    if len(df) > 100:
        duplicates = df.sample(n=int(len(df) * 0.01))
        df = pd.concat([df, duplicates], ignore_index=True)
    
    # Shuffle slightly but keep mostly sorted by date
    df = df.sort_values(['Date', 'Store_ID', 'Product_ID']).reset_index(drop=True)
    
    # Save
    os.makedirs('data/raw', exist_ok=True)
    file_path = 'data/raw/mock_sales_data.csv'
    df.to_csv(file_path, index=False)
    print(f"Generated mock data with {len(df)} rows and saved to {file_path}")
    return file_path

if __name__ == "__main__":
    generate_mock_data()
