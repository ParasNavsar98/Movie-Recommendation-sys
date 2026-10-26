# MOVIEAI - Service Launcher for Windows PowerShell
# Launches both the FastAPI recommendation engine and the React Vite frontend

param (
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 5173
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$EngineDir = Join-Path $ProjectRoot "movieai-recommendation-engine"
$PythonExe = Join-Path $EngineDir ".venv\Scripts\python.exe"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " MOVIEAI — Service Launcher" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Check Python environment
if (-not (Test-Path $PythonExe)) {
    Write-Warning "Virtual environment not found at: $PythonExe"
    Write-Host "Creating virtual environment and installing dependencies..." -ForegroundColor Yellow
    py -3 -m venv (Join-Path $EngineDir ".venv")
    & $PythonExe -m pip install --upgrade pip
    & $PythonExe -m pip install -r (Join-Path $EngineDir "requirements-dev.txt")
}

# Start Backend
if (-not $FrontendOnly) {
    Write-Host "`n[1/2] Starting FastAPI Recommendation Backend on port $BackendPort..." -ForegroundColor Green
    $backendCmd = "Set-Location '$EngineDir'; & '$PythonExe' -m uvicorn movieai.main:app --host 127.0.0.1 --port $BackendPort --reload"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd
    Start-Sleep -Seconds 2

    # Verify Health
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/health" -Method Get -TimeoutSec 5
        Write-Host "  -> Backend is healthy! Ready: $($health.ready), Total Movies: $($health.movies)" -ForegroundColor Green
    } catch {
        Write-Host "  -> Backend started (health check will be available once model loads)" -ForegroundColor Yellow
    }
}

# Start Frontend
if (-not $BackendOnly) {
    Write-Host "`n[2/2] Starting React Vite Frontend..." -ForegroundColor Green
    $frontendCmd = "Set-Location '$ProjectRoot'; npm run dev"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd
}

Write-Host "`nServices launched successfully!" -ForegroundColor Cyan
Write-Host "Frontend URL:  http://localhost:5173/explore" -ForegroundColor White
Write-Host "Backend API:   http://127.0.0.1:$BackendPort/health" -ForegroundColor White
Write-Host "Swagger Docs:  http://127.0.0.1:$BackendPort/docs" -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Cyan
