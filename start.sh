#!/usr/bin/env bash
set -e

echo "===================================================="
echo "      Starting Vouch AI Engine & Backend"
echo "===================================================="

# Start AI Engine in the background
echo "[1] Starting Python AI Engine on port 8080..."
(cd vouch-ai-engine && uvicorn app:app --port 8080) &
AI_PID=$!

# Start NestJS Backend
echo "[2] Starting NestJS Backend on port 5000..."
(cd vouch-backend && pnpm run start:dev)

# Cleanup background AI engine if backend is stopped (Ctrl+C)
trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT
