from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ChatMessage(BaseModel):
    message: str
    selected_datasets: List[str] = []
    history: List[Dict[str, str]] = []


class ChatResponse(BaseModel):
    message: str
    chart_data: Optional[Dict[str, Any]] = None
    report: Optional[Dict[str, Any]] = None


class AnalysisRequest(BaseModel):
    dataset_names: List[str] = []
