import lime
import lime.lime_tabular
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import os

class XAIEngine:
    def __init__(self, model, X_train: pd.DataFrame):
        self.model = model
        self.X_train = X_train
        
        # Optimize memory and inference speed by sampling a max of 1000 representative records
        sample_size = min(1000, len(self.X_train))
        X_sample = self.X_train.sample(sample_size, random_state=42)
        
        self.lime_explainer = lime.lime_tabular.LimeTabularExplainer(
            training_data=X_sample.values,
            feature_names=self.X_train.columns.tolist(),
            mode='regression'
        )

    def explain_local_lime(self, X_instance: pd.DataFrame, output_dir: str = None) -> dict:
        """Generates local LIME explanation."""
        
        row = X_instance.iloc[0].values
        
        exp = self.lime_explainer.explain_instance(
            data_row=row,
            predict_fn=self.model.predict,
            num_features=5
        )
        
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
            exp.save_to_file(f"{output_dir}/lime_explanation.html")
            
        return {
            "lime_values": exp.as_list(),
            "base_value": float(self.lime_explainer.expected_value[0] if hasattr(self.lime_explainer, 'expected_value') else np.mean(self.model.predict(self.X_train)))
        }

    def generate_english_explanation(self, prediction: float, base_value: float, lime_values_list: list) -> str:
        """Translates LIME values into a Plain English business explanation."""
        # lime_values_list is e.g. [('feature > 0', 0.5), ('feature2 <= 1', -0.2)]
        
        top_positive = []
        top_negative = []
        
        for condition, impact in lime_values_list:
            if impact > 0:
                top_positive.append((condition, impact))
            else:
                top_negative.append((condition, impact))
                
        explanation = f"The forecast demand is {prediction:.1f} units. "
        
        if top_positive:
            cond, val = top_positive[0]
            explanation += f"The strongest positive driver increasing demand is '{cond}' (+{val:.1f} units). "
            
        if top_negative:
            cond, val = top_negative[0]
            explanation += f"Conversely, the strongest negative driver decreasing demand is '{cond}' ({val:.1f} units). "
            
        # Overall trend
        if prediction > base_value:
            explanation += f"Overall, the specific conditions for this instance push the demand above the average baseline of {base_value:.1f} units."
        else:
            explanation += f"Overall, the specific conditions for this instance pull the demand below the average baseline of {base_value:.1f} units."
            
        return explanation
