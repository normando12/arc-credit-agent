# ARC Credit Agent

Autonomous credit scoring agent for **Arc Network Testnet** using the **ERC-8004 Agent Identity Standard**.

Analyzes blockchain wallets, generates transparent credit scores (0–1000), registers on-chain identity, and supports reputation and validation workflows.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Next.js UI     │────▶│  Express API     │────▶│  PostgreSQL         │
│  Dashboard      │     │  /api/v1/*       │     │  scores, validations│
└─────────────────┘     └────────┬─────────┘     └─────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              Wallet       Credit Score   ERC-8004
              Analyzer     Engine         Registries
                    │            │            │
                    └────────────┴────────────┘
                                 │
                          Arc Testnet RPC
                          Chain ID: 5042002
```

## Features

- **Wallet Analysis** — activity, age, DeFi interactions, diversification, risk flags
- **Credit Score Engine** — weighted 0–1000 score with explainable factors
- **ERC-8004 Identity** — IPFS metadata, IdentityRegistry registration, URI upgrades
- **Reputation System** — on-chain feedback via ReputationRegistry
- **Validation Workflow** — requestValidation / submitValidation / getValidationStatus
- **Security** — rate limiting, Zod validation, audit logging, Helmet

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)
- Arc Testnet USDC ([faucet.circle.com](https://faucet.circle.com))

### Setup

```bash
git clone <repo>
cd arc-credit-agent
cp .env.example .env
```

On Windows:

```powershell
.\scripts\deploy.ps1
```

On Linux/macOS:

```bash
chmod +x scripts/deploy.sh && ./scripts/deploy.sh
```

### Configure Environment

Edit `.env`:

```env
AGENT_PRIVATE_KEY=0x...          # Funded with Arc Testnet USDC
VALIDATOR_PRIVATE_KEY=0x...      # Separate wallet for validation/reputation
PINATA_JWT=...                   # Optional — for IPFS uploads
DATABASE_URL=postgresql://arc_agent:arc_agent_dev@localhost:5432/arc_credit_agent
```

### Register Agent (ERC-8004)

```bash
npm run register:agent
# Add returned AGENT_ID to .env
```

### Run

```bash
npm run dev
```

- **API**: http://localhost:3001
- **Dashboard**: http://localhost:3000

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/analyze` | Analyze wallet activity |
| POST | `/api/v1/score` | Generate credit score |
| POST | `/api/v1/validate` | Request or submit validation |
| GET | `/api/v1/validate/:requestHash` | Validation status |
| GET | `/api/v1/agent` | Agent identity info |
| GET | `/api/v1/reputation` | Reputation metrics |
| GET | `/api/v1/health` | Health check |

### Example: Score a Wallet

```bash
curl -X POST http://localhost:3001/api/v1/score \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0x742d35Cc6634C0532925a3b844Bc454e4438f44e"}'
```

Response:

```json
{
  "success": true,
  "data": {
    "wallet": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "credit_score": 845,
    "risk_level": "LOW",
    "confidence": 92,
    "explanation": [
      "Wallet active for 18 months.",
      "150 total transactions recorded.",
      "Interacted with 3 protocols/assets.",
      "Consistent transaction history.",
      "No suspicious activity detected."
    ]
  }
}
```

## ERC-8004 Contracts (Arc Testnet)

| Contract | Address |
|----------|---------|
| IdentityRegistry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| ReputationRegistry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| ValidationRegistry | `0x8004Cb1BF31DAf7788923b405b754f57acEB4272` |

## Credit Score Factors

| Factor | Weight |
|--------|--------|
| Wallet Longevity | 20% |
| Transaction Frequency | 15% |
| Portfolio Diversification | 15% |
| Historical Activity | 15% |
| DeFi Participation | 15% |
| Smart Contract Quality | 10% |
| Risk Indicators | 10% |

## Project Structure

```
arc-credit-agent/
├── backend/           # Express API, scoring engine, blockchain layer
│   ├── src/
│   │   ├── blockchain/    # ethers.js provider & contract ABIs
│   │   ├── services/      # analyzer, scorer, identity, validation
│   │   ├── routes/        # REST endpoints
│   │   ├── db/            # PostgreSQL schema & repository
│   │   └── middleware/    # rate limit, validation, audit
│   ├── scripts/       # register-agent.ts
│   └── tests/
├── frontend/          # Next.js dashboard
├── scripts/           # deploy.sh, deploy.ps1
├── docker-compose.yml
└── docs/
```

## Testing

```bash
npm test
```

## Network Reference

| Parameter | Value |
|-----------|-------|
| Chain ID | 5042002 |
| RPC | https://rpc.testnet.arc.network |
| Explorer | https://testnet.arcscan.app |
| Gas Token | USDC |

## License

MIT
