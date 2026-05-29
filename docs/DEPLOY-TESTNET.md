# Deploy Arc Testnet — Guia Rápido

## Status atual

| Etapa | Status |
|-------|--------|
| Projeto configurado (`.env`) | ✅ |
| Conexão Arc RPC (5042002) | ✅ |
| PostgreSQL | ⚠️ Opcional (Docker ou instalação manual) |
| Wallet financiada | ❌ **Pendente** |
| Registro ERC-8004 on-chain | ❌ Aguardando USDC |

## Passo 1 — Financiar a wallet

1. Abra [faucet.circle.com](https://faucet.circle.com)
2. Selecione **Arc Testnet**
3. Selecione **USDC**
4. Cole o endereço da agent wallet (está no `.env` — derive de `AGENT_PRIVATE_KEY` ou execute `npm run check:deploy`)

> **Alternativa:** substitua `AGENT_PRIVATE_KEY` no `.env` por uma wallet **já financiada** na Arc Testnet.

## Passo 2 — Deploy on-chain

```powershell
cd C:\Users\normando\arc-credit-agent
npm run deploy:testnet
```

Isso irá:
- Registrar o agente no **IdentityRegistry** (`0x8004A818...`)
- Publicar metadata ERC-8004
- Salvar `AGENT_ID` no `.env`

## Passo 3 — Iniciar serviços

```powershell
npm run dev
```

- API: http://localhost:3001
- Dashboard: http://localhost:3000

## Verificar status

```powershell
npm run check:deploy
```

## Contratos Arc Testnet

| Contrato | Endereço |
|----------|----------|
| IdentityRegistry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| ReputationRegistry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| ValidationRegistry | `0x8004Cb1BF31DAf7788923b405b754f57acEB4272` |

## Faucet via API (opcional)

Se tiver Circle API Key, adicione ao `.env`:

```
CIRCLE_API_KEY=sua_chave
```

O script `deploy:testnet` solicitará USDC automaticamente.

## Segurança

- As chaves no `.env` são **somente testnet**
- **Nunca** use estas chaves em mainnet
- Não commite o arquivo `.env`
