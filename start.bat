@echo off
echo ====================================================
echo       Starting Vouch AI Engine & Backend
echo ====================================================

echo [1] Starting Python AI Engine on port 8080...
start "Vouch AI Engine" /b cmd /c "cd vouch-ai-engine && uvicorn app:app --port 8080"

echo [2] Starting NestJS Backend on port 5000...
cd vouch-backend && pnpm run start:dev
