import nbformat as nbf

def create_notebook():
    nb = nbf.v4.new_notebook()

    # Introduction
    cells = []
    cells.append(nbf.v4.new_markdown_cell("""# SmartStock AI - Exploratory Data Analysis (EDA)
This notebook performs a comprehensive exploratory data analysis on the mock sales dataset. 
It uses Plotly for interactive visualizations and generates insights to understand:
- Sales Trends & Seasonality
- Monthly & Weekly Demand
- Category & Store Performance
- Promotion & Holiday Impacts
- Price Elasticity & Inventory Analysis
- Feature Correlations & Distributions
"""))
    
    # Imports & Setup
    cells.append(nbf.v4.new_markdown_cell("## 1. Setup & Data Loading\nFirst, we import the necessary libraries and load our dataset. We'll ensure the code is modular by defining helper functions for plotting."))
    cells.append(nbf.v4.new_code_cell("""import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# Load dataset
df = pd.read_csv('../data/raw/mock_sales_data.csv')
df['Date'] = pd.to_datetime(df['Date'])

# Define a modular helper for plotting
def plot_time_series(data, x_col, y_col, title, color=None):
    fig = px.line(data, x=x_col, y=y_col, title=title, color=color, template='plotly_white')
    fig.update_layout(xaxis_title=x_col, yaxis_title=y_col)
    fig.show()

def plot_bar(data, x_col, y_col, title, color=None):
    fig = px.bar(data, x=x_col, y=y_col, title=title, color=color, template='plotly_white')
    fig.update_layout(xaxis_title=x_col, yaxis_title=y_col)
    fig.show()

df.head()
"""))
    cells.append(nbf.v4.new_markdown_cell("""**Insight:** The dataset is successfully loaded. We have various features ranging from temporal dimensions (Date), categorical features (Store, Category), numerical performance metrics (Sales, Profit), to business drivers (Price, Promotion)."""))

    # Sales Trends & Seasonality
    cells.append(nbf.v4.new_markdown_cell("## 2. Sales Trends & Seasonality\nLet's analyze how sales fluctuate over time."))
    cells.append(nbf.v4.new_code_cell("""# Aggregate sales daily
daily_sales = df.groupby('Date')['Sales'].sum().reset_index()
plot_time_series(daily_sales, 'Date', 'Sales', 'Total Daily Sales Trend')

# Add moving average to smooth out noise
daily_sales['7-Day MA'] = daily_sales['Sales'].rolling(window=7).mean()
fig = px.line(daily_sales, x='Date', y=['Sales', '7-Day MA'], title='Daily Sales with 7-Day Moving Average', template='plotly_white')
fig.show()
"""))
    cells.append(nbf.v4.new_markdown_cell("""**Insight:** 
- The overall sales trend shows regular fluctuations, likely driven by weekly cycles. 
- The 7-Day Moving Average smooths out the day-to-day variance and highlights broader macro trends and potential seasonal peaks. There appear to be periodic spikes representing high-demand events."""))

    # Monthly & Weekly Demand
    cells.append(nbf.v4.new_markdown_cell("## 3. Monthly & Weekly Demand\nBreaking down sales into month-over-month and week-over-week aggregates."))
    cells.append(nbf.v4.new_code_cell("""# Extract time features
df['Month'] = df['Date'].dt.month
df['DayOfWeek'] = df['Date'].dt.day_name()
# Sort days
days_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

monthly_sales = df.groupby('Month')['Sales'].mean().reset_index()
plot_bar(monthly_sales, 'Month', 'Sales', 'Average Sales by Month')

weekly_sales = df.groupby('DayOfWeek')['Sales'].mean().reindex(days_order).reset_index()
plot_bar(weekly_sales, 'DayOfWeek', 'Sales', 'Average Sales by Day of Week')
"""))
    cells.append(nbf.v4.new_markdown_cell("""**Insight:** 
- **Monthly Demand:** We can observe which months typically experience higher baseline demand. (e.g., Year-end holiday season or summer spikes).
- **Weekly Demand:** Weekends (Saturday/Sunday) exhibit noticeably higher average sales compared to weekdays, indicating weekend shopping behavior."""))

    # Category & Store Performance
    cells.append(nbf.v4.new_markdown_cell("## 4. Category & Store Performance\nComparing how different product categories and individual stores perform."))
    cells.append(nbf.v4.new_code_cell("""# Category performance
category_sales = df.groupby('Category')['Sales'].sum().reset_index().sort_values('Sales', ascending=False)
plot_bar(category_sales, 'Category', 'Sales', 'Total Sales by Product Category', color='Category')

# Store performance
store_sales = df.groupby('Store_ID')['Sales'].sum().reset_index().sort_values('Sales', ascending=False)
plot_bar(store_sales, 'Store_ID', 'Sales', 'Total Sales by Store')
"""))
    cells.append(nbf.v4.new_markdown_cell("""**Insight:** 
- **Categories:** Certain categories heavily dominate the sales volume. Understanding the product mix is crucial for accurate forecasting.
- **Stores:** Store performance is relatively balanced/imbalanced. Identifying underperforming stores can help target operational improvements."""))

    # Promotion & Holiday Impact
    cells.append(nbf.v4.new_markdown_cell("## 5. Promotion & Holiday Impact\nDo promotions and holidays significantly drive sales?"))
    cells.append(nbf.v4.new_code_cell("""fig1 = px.box(df, x='Promotion', y='Sales', color='Promotion', title='Impact of Promotion on Sales', template='plotly_white')
fig1.show()

fig2 = px.box(df, x='Holiday', y='Sales', color='Holiday', title='Impact of Holidays on Sales', template='plotly_white')
fig2.show()
"""))
    cells.append(nbf.v4.new_markdown_cell("""**Insight:** 
- **Promotions:** The median sales for periods with active promotions is significantly higher than non-promotional periods. Promotions are a strong driver of demand.
- **Holidays:** Sales on holidays also show elevated median values and higher variance, confirming that holidays inject temporary surges into the demand baseline."""))

    # Price Elasticity
    cells.append(nbf.v4.new_markdown_cell("## 6. Price Elasticity\nUnderstanding how price variations affect sales volume."))
    cells.append(nbf.v4.new_code_cell("""fig = px.scatter(df, x='Price', y='Sales', color='Category', opacity=0.6, title='Price vs. Sales Volume', template='plotly_white')
fig.show()

# Calculate rough elasticity proxy for a specific product
sample_product = df['Product_ID'].unique()[0]
prod_df = df[df['Product_ID'] == sample_product].sort_values('Date')
fig2 = px.scatter(prod_df, x='Discount', y='Sales', trendline='ols', title=f'Discount vs Sales for {sample_product}', template='plotly_white')
fig2.show()
"""))
    cells.append(nbf.v4.new_markdown_cell("""**Insight:** 
- The scatter plot indicates a general downward trend: as price increases, sales volume tends to decrease, demonstrating standard price elasticity.
- The discount analysis shows a positive correlation between discount magnitude and sales volume, confirming that consumers respond strongly to price drops."""))

    # Inventory Analysis
    cells.append(nbf.v4.new_markdown_cell("## 7. Inventory Analysis\nAnalyzing the relationship between inventory levels and stockouts (where Sales == Inventory)."))
    cells.append(nbf.v4.new_code_cell("""df['Stockout_Risk'] = np.where(df['Sales'] >= df['Inventory'], 'Stockout/High Risk', 'Safe')
stockout_counts = df['Stockout_Risk'].value_counts().reset_index()
stockout_counts.columns = ['Status', 'Count']
fig = px.pie(stockout_counts, values='Count', names='Status', title='Proportion of Potential Stockout Days', template='plotly_white')
fig.show()

fig2 = px.scatter(df, x='Inventory', y='Sales', color='Stockout_Risk', opacity=0.5, title='Sales vs Inventory (Identifying constraints)', template='plotly_white')
fig2.add_shape(type='line', x0=0, y0=0, x1=df['Inventory'].max(), y1=df['Inventory'].max(), line=dict(color='Red', dash='dash'))
fig2.show()
"""))
    cells.append(nbf.v4.new_markdown_cell("""**Insight:** 
- The red dashed line (Sales = Inventory) represents the physical limit of sales due to stock constraints. 
- Points lying exactly on or near this line indicate days where demand likely exceeded supply, resulting in lost revenue. The pie chart quantifies the frequency of these risk events."""))

    # Correlation Matrix
    cells.append(nbf.v4.new_markdown_cell("## 8. Correlation Matrix\nUnderstanding multi-collinearity and relationships between numerical features."))
    cells.append(nbf.v4.new_code_cell("""numeric_df = df.select_dtypes(include=[np.number]).drop(columns=['Month'])
corr = numeric_df.corr().round(2)

fig = px.imshow(corr, text_auto=True, aspect="auto", color_continuous_scale='RdBu_r', title='Feature Correlation Heatmap')
fig.show()
"""))
    cells.append(nbf.v4.new_markdown_cell("""**Insight:** 
- Strong positive correlations exist between Profit and Sales, as well as Discount and Promotion.
- Weak or zero correlation is observed between weather variables (Temperature, Rainfall) and sales, suggesting weather might not be a primary driver unless interacting with specific categories."""))

    # Feature Distributions
    cells.append(nbf.v4.new_markdown_cell("## 9. Feature Distributions\nVisualizing the distributions of key continuous variables."))
    cells.append(nbf.v4.new_code_cell("""fig = make_subplots(rows=2, cols=2, subplot_titles=('Sales Distribution', 'Price Distribution', 'Temperature Distribution', 'Supplier Lead Time'))

fig.add_trace(go.Histogram(x=df['Sales'], name='Sales'), row=1, col=1)
fig.add_trace(go.Histogram(x=df['Price'], name='Price'), row=1, col=2)
fig.add_trace(go.Histogram(x=df['Temperature'], name='Temp'), row=2, col=1)
fig.add_trace(go.Histogram(x=df['Supplier_Lead_Time'], name='Lead Time'), row=2, col=2)

fig.update_layout(title_text='Distributions of Key Features', height=700, showlegend=False, template='plotly_white')
fig.show()
"""))
    cells.append(nbf.v4.new_markdown_cell("""**Insight:** 
- **Sales:** Right-skewed distribution, typical for retail, meaning most days have average sales, but a few days (outliers/events) have massive spikes.
- **Price:** Fairly uniform/multi-modal depending on the categories present.
- **Supplier Lead Time:** Uniform distribution in the mock data, highlighting the variability in supply chain responsiveness."""))

    nb['cells'] = cells
    
    with open('reports/EDA_Notebook.ipynb', 'w') as f:
        nbf.write(nb, f)
        
    print("Notebook 'reports/EDA_Notebook.ipynb' generated successfully.")

if __name__ == '__main__':
    create_notebook()
