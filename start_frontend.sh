#!/bin/bash
# ─────────────────────────────────────────────────────────
#  Telecom AI Agent — Frontend Startup Script
# ─────────────────────────────────────────────────────────

echo "🎨 Starting Telecom AI Agent Frontend..."

cd "$(dirname "$0")/frontend"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

echo "📦 Installing Node dependencies..."
npm install

echo ""
echo "🌐 Starting React app on http://localhost:3000"
echo ""

npm start
