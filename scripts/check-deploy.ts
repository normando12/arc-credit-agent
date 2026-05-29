/**
 * Verifica status do deploy na Arc Testnet.
 * Usage: npx tsx scripts/check-deploy.ts
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const RPC = process.env.ARC_RPC_URL ?? "https://rpc.testnet.arc.network";
const CHAIN_ID = parseInt(process.env.ARC_CHAIN_ID ?? "5042002", 10);
const IDENTITY = process.env.IDENTITY_REGISTRY ?? "0x8004A818BFB912233c491871b3d84c89A494BD9e";

async function main() {
  const pk = process.env.AGENT_PRIVATE_KEY;
  if (!pk) {
    console.log("❌ AGENT_PRIVATE_KEY não configurada no .env");
    process.exit(1);
  }

  const wallet = new ethers.Wallet(pk);
  const provider = new ethers.JsonRpcProvider(RPC, CHAIN_ID);
  const [balance, block, agentId] = await Promise.all([
    provider.getBalance(wallet.address),
    provider.getBlockNumber(),
    Promise.resolve(process.env.AGENT_ID ? parseInt(process.env.AGENT_ID, 10) : null),
  ]);

  console.log("\n=== Status Deploy Arc Testnet ===\n");
  console.log(`Rede:          Arc Testnet (${CHAIN_ID})`);
  console.log(`Bloco atual:   ${block}`);
  console.log(`Agent wallet:  ${wallet.address}`);
  console.log(`Saldo USDC:    ${ethers.formatUnits(balance, 18)}`);
  console.log(`Agent ID:      ${agentId ?? "não registrado"}`);

  if (balance === 0n) {
    console.log("\n⏳ Pendente: financiar wallet no faucet");
    console.log("   https://faucet.circle.com → Arc Testnet → USDC");
    console.log(`   Endereço: ${wallet.address}`);
    console.log("\n   Depois execute: npm run deploy:testnet\n");
    process.exit(1);
  }

  if (!agentId) {
    console.log("\n⏳ Pendente: registrar agente on-chain");
    console.log("   Execute: npm run deploy:testnet\n");
    process.exit(1);
  }

  console.log(`\n✅ Agente registrado`);
  console.log(`   Explorer: https://testnet.arcscan.app/address/${IDENTITY}`);
  console.log(`   Iniciar:  npm run dev\n`);
}

main().catch(console.error);
