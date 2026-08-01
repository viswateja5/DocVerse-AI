import pandas as pd
import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin
import holidays

class CleaningTransformer(BaseEstimator, TransformerMixin):
    """
    Handles missing values and duplicates.
    Fit learns medians/modes.
    Transform applies them and removes duplicates.
    """
    def __init__(self, num_strategy='median', cat_strategy='mode'):
        self.num_strategy = num_strategy
        self.cat_strategy = cat_strategy
        self.fill_values_ = {}
        
    def fit(self, X, y=None):
        X_df = pd.DataFrame(X)
        self.numeric_cols_ = X_df.select_dtypes(include=[np.number]).columns
        self.cat_cols_ = X_df.select_dtypes(exclude=[np.number]).columns
        
        for col in self.numeric_cols_:
            if self.num_strategy == 'median':
                self.fill_values_[col] = X_df[col].median()
            elif self.num_strategy == 'mean':
                self.fill_values_[col] = X_df[col].mean()
                
        for col in self.cat_cols_:
            if len(X_df[col].mode()) > 0:
                self.fill_values_[col] = X_df[col].mode()[0]
            else:
                self.fill_values_[col] = 'Unknown'
        return self
        
    def transform(self, X):
        X_df = pd.DataFrame(X).copy()
        
        # Remove duplicates
        if not X_df.index.is_unique:
             X_df = X_df.reset_index(drop=True)
        X_df = X_df.drop_duplicates()
        
        # Fill missing values
        for col, val in self.fill_values_.items():
            if col in X_df.columns:
                X_df[col] = X_df[col].fillna(val)
                
        return X_df

class OutlierTransformer(BaseEstimator, TransformerMixin):
    """
    Caps outliers using the IQR method.
    Fit learns the bounds. Transform applies capping.
    """
    def __init__(self, columns=None, factor=1.5):
        self.columns = columns
        self.factor = factor
        self.bounds_ = {}
        
    def fit(self, X, y=None):
        X_df = pd.DataFrame(X)
        cols_to_fit = self.columns if self.columns else X_df.select_dtypes(include=[np.number]).columns
        
        for col in cols_to_fit:
            if col in X_df.columns:
                q1 = X_df[col].quantile(0.25)
                q3 = X_df[col].quantile(0.75)
                iqr = q3 - q1
                lower_bound = q1 - (self.factor * iqr)
                upper_bound = q3 + (self.factor * iqr)
                self.bounds_[col] = (lower_bound, upper_bound)
        return self
        
    def transform(self, X):
        X_df = pd.DataFrame(X).copy()
        for col, (lower, upper) in self.bounds_.items():
            if col in X_df.columns:
                X_df[col] = np.clip(X_df[col], lower, upper)
        return X_df

class TimeFeatureExtractor(BaseEstimator, TransformerMixin):
    """
    Extracts time-series features from the Date column.
    """
    def __init__(self, date_column='Date', country='US'):
        self.date_column = date_column
        self.country = country
        self.holiday_obj = holidays.country_holidays(self.country)
        
    def fit(self, X, y=None):
        return self
        
    def transform(self, X):
        X_df = pd.DataFrame(X).copy()
        if self.date_column not in X_df.columns:
            return X_df
            
        X_df[self.date_column] = pd.to_datetime(X_df[self.date_column])
        
        X_df['Day'] = X_df[self.date_column].dt.day
        X_df['Week'] = X_df[self.date_column].dt.isocalendar().week.astype(int)
        X_df['Month'] = X_df[self.date_column].dt.month
        X_df['Quarter'] = X_df[self.date_column].dt.quarter
        X_df['Year'] = X_df[self.date_column].dt.year
        X_df['Day_of_Week'] = X_df[self.date_column].dt.dayofweek
        
        X_df['Is_Weekend'] = X_df['Day_of_Week'].apply(lambda x: 1 if x >= 5 else 0)
        
        # Is Holiday
        def check_holiday(d):
            return 1 if d in self.holiday_obj else 0
        X_df['Is_Holiday'] = X_df[self.date_column].apply(check_holiday)
        
        # Festival Flag (simple approximation: Q4 months, usually higher sales in retail)
        X_df['Festival_Flag'] = X_df['Month'].apply(lambda x: 1 if x in [11, 12] else 0)
        
        return X_df

class LagRollingFeatureExtractor(BaseEstimator, TransformerMixin):
    """
    Creates lag and rolling features.
    Grouping by Store_ID and Product_ID.
    Ensure dataframe is sorted by Date before calling transform!
    """
    def __init__(self, date_col='Date', group_cols=['Store_ID', 'Product_ID'], target_col='Sales', lags=[1, 7, 14, 30], windows=[7]):
        self.date_col = date_col
        self.group_cols = group_cols
        self.target_col = target_col
        self.lags = lags
        self.windows = windows
        
    def fit(self, X, y=None):
        return self
        
    def transform(self, X):
        X_df = pd.DataFrame(X).copy()
        if self.target_col not in X_df.columns or not all(c in X_df.columns for c in self.group_cols):
            return X_df
            
        X_df = X_df.sort_values(by=[*self.group_cols, self.date_col])
        grouped = X_df.groupby(self.group_cols)[self.target_col]
        
        # Lags
        for lag in self.lags:
            X_df[f'{self.target_col}_Lag_{lag}'] = grouped.shift(lag)
            
        # Rolling Features (CRITICAL FIX: Shift by 1 before rolling to prevent data leakage!)
        grouped_shifted = grouped.shift(1)
        
        for window in self.windows:
            rolling_obj = grouped_shifted.rolling(window=window, min_periods=1)
            # Need to align index back to original dataframe because grouped.rolling returns MultiIndex
            X_df[f'Rolling_Mean_{window}'] = rolling_obj.mean().reset_index(level=self.group_cols, drop=True)
            X_df[f'Rolling_Median_{window}'] = rolling_obj.median().reset_index(level=self.group_cols, drop=True)
            X_df[f'Rolling_Std_{window}'] = rolling_obj.std().reset_index(level=self.group_cols, drop=True)
            X_df[f'Rolling_Max_{window}'] = rolling_obj.max().reset_index(level=self.group_cols, drop=True)
            X_df[f'Rolling_Min_{window}'] = rolling_obj.min().reset_index(level=self.group_cols, drop=True)
            
        return X_df

class InventoryPriceFeatureExtractor(BaseEstimator, TransformerMixin):
    """
    Creates inventory and price related features.
    """
    def fit(self, X, y=None):
        return self
        
    def transform(self, X):
        X_df = pd.DataFrame(X).copy()
        
        # Inventory Features
        # Average Daily Demand using the Rolling_Mean_7 we generated
        if 'Rolling_Mean_7' in X_df.columns:
            X_df['Average_Daily_Demand'] = X_df['Rolling_Mean_7']
        else:
            X_df['Average_Daily_Demand'] = X_df['Sales'] # Fallback
            
        # Days Until Stockout (prevent division by zero)
        X_df['Days_Until_Stockout'] = X_df['Inventory'] / X_df['Average_Daily_Demand'].replace(0, 1)
        
        # Safety Stock = Z (assume 1.65 for 95% service level) * Std_Dev * sqrt(Lead_Time)
        # Simplified: using Rolling_Std_7 as Std_Dev
        if 'Rolling_Std_7' in X_df.columns and 'Supplier_Lead_Time' in X_df.columns:
            std_dev = X_df['Rolling_Std_7'].fillna(0)
            lead_time = X_df['Supplier_Lead_Time']
            X_df['Safety_Stock'] = 1.65 * std_dev * np.sqrt(lead_time)
        else:
            X_df['Safety_Stock'] = 0
            
        # Price Features
        if 'Price' in X_df.columns and 'Cost' in X_df.columns:
            # Discount % (could be inferred if we have original price, or just use Discount col)
            if 'Discount' not in X_df.columns:
                X_df['Discount_%'] = (X_df['Price'] - X_df['Cost']) / X_df['Price'].replace(0, 1)
            else:
                X_df['Discount_%'] = X_df['Discount']
                
            X_df['Price_Difference'] = X_df['Price'] - X_df['Cost']
            
            # Elasticity Proxy = % change in Sales / % change in Price (comparing to lag 1)
            if 'Sales_Lag_1' in X_df.columns:
                # Need Price Lag 1 too for true elasticity, computing locally
                grouped = X_df.groupby(['Store_ID', 'Product_ID'])['Price']
                X_df['Price_Lag_1'] = grouped.shift(1)
                
                pct_change_sales = (X_df['Sales'] - X_df['Sales_Lag_1']) / X_df['Sales_Lag_1'].replace(0, 1)
                pct_change_price = (X_df['Price'] - X_df['Price_Lag_1']) / X_df['Price_Lag_1'].replace(0, 1)
                
                # Handling inf/-inf/nan
                elasticity = pct_change_sales / pct_change_price.replace(0, 0.0001)
                X_df['Elasticity'] = elasticity.replace([np.inf, -np.inf], np.nan).fillna(0)
            
        return X_df
