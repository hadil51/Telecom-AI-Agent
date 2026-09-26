"""
Telecom AI Agent - FastAPI Backend
Drive Test Analysis for LTE (4G) and UMTS (3G) networks
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
import json
from pathlib import Path

from data_processor import DataProcessor
from ai_agent import TelecomAIAgent
from models import ChatMessage, ChatResponse, AnalysisRequest

app = FastAPI(
    title="Telecom AI Agent API",
    description="AI-powered drive test analysis for LTE & UMTS networks",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent.parent / "data"
processor = DataProcessor(DATA_DIR)
agent = TelecomAIAgent(processor)


@app.on_event("startup")
async def startup_event():
    """Load default datasets on startup."""
    processor.load_default_datasets()
    print("✅ Default datasets loaded")


@app.get("/")
def root():
    return {"status": "running", "service": "Telecom AI Agent"}


@app.get("/api/datasets")
def get_datasets():
    """Return list of loaded datasets with summary stats."""
    return processor.get_datasets_summary()


@app.get("/api/dataset/{name}/stats")
def get_dataset_stats(name: str):
    """Return detailed statistics for a specific dataset."""
    stats = processor.get_detailed_stats(name)
    if not stats:
        raise HTTPException(status_code=404, detail=f"Dataset '{name}' not found")
    return stats


@app.get("/api/dataset/{name}/kpi-distribution")
def get_kpi_distribution(name: str):
    """Return KPI classification distribution for charts."""
    dist = processor.get_kpi_distribution(name)
    if not dist:
        raise HTTPException(status_code=404, detail=f"Dataset '{name}' not found")
    return dist


@app.get("/api/dataset/{name}/timeseries")
def get_timeseries(name: str, kpi: str = "RSRP", limit: int = 200):
    """Return time-series data for a specific KPI."""
    ts = processor.get_timeseries(name, kpi, limit)
    if ts is None:
        raise HTTPException(status_code=404, detail="Dataset or KPI not found")
    return ts


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a new drive test file (XLSX or CSV)."""
    if not file.filename.endswith(('.xlsx', '.csv')):
        raise HTTPException(status_code=400, detail="Only .xlsx and .csv files accepted")
    
    save_path = DATA_DIR / file.filename
    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)
    
    result = processor.load_file(save_path)
    if not result["success"]:
        save_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=result["error"])
    
    return {"message": f"File '{file.filename}' uploaded successfully", "dataset": result["name"], "rows": result["rows"]}


@app.post("/api/chat")
async def chat(message: ChatMessage):
    """Main chat endpoint - AI agent responds to user questions."""
    try:
        response = await agent.respond(
            user_message=message.message,
            selected_datasets=message.selected_datasets,
            history=message.history
        )
        return ChatResponse(
            message=response["text"],
            chart_data=response.get("chart_data"),
            report=response.get("report")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/report")
async def generate_report(req: AnalysisRequest):
    """Generate a full automatic network quality report."""
    try:
        report = processor.generate_full_report(req.dataset_names)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
def health():
    return {"status": "healthy", "datasets_loaded": len(processor.datasets)}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
