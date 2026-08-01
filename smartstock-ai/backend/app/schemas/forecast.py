from pydantic import BaseModel
from typing import Dict, Any, List, Optional

class ExplanationRequest(BaseModel):
    features: Dict[str, float]
    model_name: Optional[str] = "CatBoost"

class ExplanationResponse(BaseModel):
    prediction: float
    shap_values: Dict[str, float]
    base_value: float
    plain_english_explanation: str
