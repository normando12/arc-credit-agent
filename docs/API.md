# API Reference

Base URL: `http://localhost:3001/api/v1`

## POST /analyze

Analyze wallet on-chain activity.

**Body:**
```json
{ "wallet": "0x..." }
```

## POST /score

Generate credit score with explanation.

**Body:**
```json
{ "wallet": "0x..." }
```

## POST /validate

### Request validation
```json
{
  "wallet": "0x...",
  "scoreId": "uuid-from-score-response"
}
```

### Submit validation (validator wallet)
```json
{
  "requestHash": "0x...",
  "approved": true,
  "accuracy": 95,
  "comment": "Score matches manual review"
}
```

## GET /validate/:requestHash

Returns validation status from database and on-chain registry.

## GET /agent

Returns ERC-8004 agent identity, capabilities, and registration status.

## GET /reputation

Returns reputation metrics, validator reviews, and on-chain summary.

## GET /health

Returns API, database, and blockchain connectivity status.
