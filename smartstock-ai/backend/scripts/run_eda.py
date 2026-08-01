import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os

def run_eda(data_path='data/raw/mock_sales_data.csv', output_dir='reports/eda'):
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Loading data from {data_path}...")
    df = pd.read_csv(data_path)
    
    # Basic Info
    with open(f"{output_dir}/summary.txt", "w") as f:
        f.write("=== Dataset Info ===\n")
        df.info(buf=f)
        f.write("\n=== Missing Values ===\n")
        f.write(str(df.isnull().sum()))
        f.write("\n\n=== Descriptive Statistics ===\n")
        f.write(str(df.describe()))
        
    print("Generating plots...")
    
    # 1. Missing values heatmap
    plt.figure(figsize=(10, 6))
    sns.heatmap(df.isnull(), cbar=False, cmap='viridis', yticklabels=False)
    plt.title("Missing Values Heatmap")
    plt.tight_layout()
    plt.savefig(f"{output_dir}/missing_values.png")
    plt.close()
    
    # 2. Sales distribution
    plt.figure(figsize=(10, 6))
    sns.histplot(df['Sales'].dropna(), bins=50, kde=True)
    plt.title("Sales Distribution (Shows potential outliers)")
    plt.tight_layout()
    plt.savefig(f"{output_dir}/sales_distribution.png")
    plt.close()
    
    # 3. Correlation matrix
    plt.figure(figsize=(12, 10))
    numeric_df = df.select_dtypes(include=['float64', 'int64'])
    corr = numeric_df.corr()
    sns.heatmap(corr, annot=True, cmap='coolwarm', fmt=".2f", square=True)
    plt.title("Correlation Matrix")
    plt.tight_layout()
    plt.savefig(f"{output_dir}/correlation_matrix.png")
    plt.close()
    
    # 4. Sales over time (aggregated)
    plt.figure(figsize=(14, 6))
    df['Date'] = pd.to_datetime(df['Date'])
    daily_sales = df.groupby('Date')['Sales'].sum().reset_index()
    sns.lineplot(data=daily_sales, x='Date', y='Sales')
    plt.title("Total Daily Sales Over Time")
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig(f"{output_dir}/daily_sales_trend.png")
    plt.close()
    
    print(f"EDA complete. Reports and plots saved to {output_dir}")

if __name__ == "__main__":
    run_eda()
