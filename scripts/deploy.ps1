# ARC Credit Agent — Deployment (Windows)

Write-Host "=== ARC Credit Agent Deployment ===" -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example" -ForegroundColor Yellow
    Write-Host "Edit .env with AGENT_PRIVATE_KEY before on-chain registration."
}

Write-Host "Starting PostgreSQL..."
docker compose up -d postgres
Start-Sleep -Seconds 5

Write-Host "Installing dependencies..."
npm install

Write-Host "Running migrations..."
npm run db:migrate

Write-Host "Building..."
npm run build

Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Fund wallet: https://faucet.circle.com"
Write-Host "  2. Set AGENT_PRIVATE_KEY in .env"
Write-Host "  3. npm run register:agent"
Write-Host "  4. npm run dev"
