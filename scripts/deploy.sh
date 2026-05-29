#!/usr/bin/env bash
set -euo pipefail

echo "=== ARC Credit Agent Deployment ==="

if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
  echo "⚠️  Edit .env with your AGENT_PRIVATE_KEY before registering on-chain."
fi

echo "Starting PostgreSQL..."
docker compose up -d postgres

echo "Waiting for database..."
sleep 5

echo "Installing dependencies..."
npm install

echo "Running migrations..."
npm run db:migrate

echo "Building..."
npm run build

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "  1. Fund agent wallet with USDC from https://faucet.circle.com"
echo "  2. Set AGENT_PRIVATE_KEY in .env"
echo "  3. Register agent: npm run register:agent"
echo "  4. Start dev servers: npm run dev"
echo ""
