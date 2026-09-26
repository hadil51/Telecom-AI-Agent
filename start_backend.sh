#!/bin/bash
# ─────────────────────────────────────────────────────────
#  Telecom AI Agent — Backend Startup Script (Grok / xAI)
# ─────────────────────────────────────────────────────────

echo "🚀 Starting Telecom AI Agent Backend..."

cd "$(dirname "$0")/backend"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python 3.10+"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt -q

echo "✅ Using Groq API — set GROQ_API_KEY in your environment"
echo "🌐 Starting FastAPI on http://localhost:8000"
echo "📋 API docs: http://localhost:8000/docs"
echo ""

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
