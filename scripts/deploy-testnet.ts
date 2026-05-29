/**
 * Full Arc Testnet deployment script.
 * Usage: npx tsx scripts/deploy-testnet.ts
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const RPC = process.env.ARC_RPC_URL ?? "https://rpc.testnet.arc.network";
const CHAIN_ID = parseInt(process.env.ARC_CHAIN_ID ?? "5042002", 10);
const IDENTITY = process.env.IDENTITY_REGISTRY ?? "0x8004A818BFB912233c491871b3d84c89A494BD9e";

const IDENTITY_ABI = [
  "function register(string agentURI) returns (uint256 agentId)",
  "function setAgentURI(uint256 agentId, string newURI)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)",
];

function log(step: string, msg: string) {
  console.log(`\n[${step}] ${msg}`);
}

async function checkRpc(): Promise<boolean> {
  const provider = new ethers.JsonRpcProvider(RPC, CHAIN_ID);
  const [network, block] = await Promise.all([provider.getNetwork(), provider.getBlockNumber()]);
  log("1/5", `Arc Testnet conectada — chainId ${network.chainId}, bloco ${block}`);
  return true;
}

async function checkBalance(address: string): Promise<bigint> {
  const provider = new ethers.JsonRpcProvider(RPC, CHAIN_ID);
  return provider.getBalance(address);
}

async function requestFaucet(address: string): Promise<boolean> {
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) return false;

  try {
    const res = await fetch("https://api.circle.com/v1/faucet/drips", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address,
        blockchain: "ARC-TESTNET",
        usdc: true,
      }),
    });
    if (res.status === 204 || res.ok) {
      log("2/5", "USDC solicitado via Circle Faucet API");
      return true;
    }
    console.warn("Faucet API:", await res.text());
  } catch (e) {
    console.warn("Faucet API indisponível:", e);
  }
  return false;
}

async function waitForFunds(address: string, maxWaitSec = 120): Promise<boolean> {
  const provider = new ethers.JsonRpcProvider(RPC, CHAIN_ID);
  const start = Date.now();
  while (Date.now() - start < maxWaitSec * 1000) {
    const bal = await provider.getBalance(address);
    if (bal > 0n) {
      log("2/5", `Wallet financiada: ${ethers.formatUnits(bal, 18)} USDC`);
      return true;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  return false;
}

async function registerOnChain(): Promise<{ agentId: number; txHash: string; metadataUri: string }> {
  const privateKey = process.env.AGENT_PRIVATE_KEY;
  if (!privateKey) throw new Error("AGENT_PRIVATE_KEY não configurada");

  const provider = new ethers.JsonRpcProvider(RPC, CHAIN_ID);
  const wallet = new ethers.Wallet(privateKey, provider);
  const registry = new ethers.Contract(IDENTITY, IDENTITY_ABI, wallet);
  const agentRegistry = `eip155:${CHAIN_ID}:${IDENTITY}`;

  log("4/5", `Registrando agente — wallet ${wallet.address}`);

  const placeholder = "ipfs://placeholder";
  const tx = await registry.register(placeholder);
  const receipt = await tx.wait();

  let agentId = 0;
  for (const logEntry of receipt.logs) {
    try {
      const parsed = registry.interface.parseLog(logEntry);
      if (parsed?.name === "Registered") {
        agentId = Number(parsed.args[0]);
        break;
      }
    } catch {
      /* skip */
    }
  }

  if (!agentId) {
    throw new Error("Não foi possível obter agentId do evento Registered");
  }

  const metadata = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: process.env.AGENT_NAME ?? "ARC Credit Agent",
    version: process.env.AGENT_VERSION ?? "1.0.0",
    description: process.env.AGENT_DESCRIPTION ?? "AI-powered on-chain credit scoring agent.",
    image: "ipfs://bafkreiaims435hmzeg3l6ixlrlvnei7wept5kmfd6c2ncz3ucl466xhucu",
    capabilities: ["wallet_analysis", "credit_scoring", "risk_assessment"],
    services: [
      {
        name: "REST API",
        endpoint: `${process.env.API_BASE_URL ?? "http://localhost:3001"}/api/v1`,
      },
    ],
    registrations: [{ agentId, agentRegistry }],
    supportedTrust: ["reputation", "validation"],
  };

  const metadataUri = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString("base64")}`;
  const updateTx = await registry.setAgentURI(agentId, metadataUri);
  await updateTx.wait();

  log("4/5", `Agente registrado — ID ${agentId}`);
  log("4/5", `TX: https://testnet.arcscan.app/tx/${receipt.hash}`);

  return { agentId, txHash: receipt.hash, metadataUri };
}

async function runMigrations(): Promise<void> {
  try {
    execSync("npm run migrate -w backend", {
      cwd: path.resolve(__dirname, ".."),
      stdio: "inherit",
    });
    log("3/5", "Migrations PostgreSQL concluídas");
  } catch {
    log("3/5", "PostgreSQL indisponível — metadata salva apenas on-chain");
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("  ARC Credit Agent — Deploy Arc Testnet");
  console.log("=".repeat(60));

  const privateKey = process.env.AGENT_PRIVATE_KEY;
  if (!privateKey) {
    console.error("Configure AGENT_PRIVATE_KEY no .env");
    process.exit(1);
  }

  const wallet = new ethers.Wallet(privateKey);
  console.log(`\nAgent wallet:     ${wallet.address}`);
  console.log(`Validator wallet: ${new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY ?? privateKey).address}`);

  await checkRpc();

  let balance = await checkBalance(wallet.address);
  if (balance === 0n) {
    log("2/5", "Saldo zero — tentando faucet...");
    const faucetOk = await requestFaucet(wallet.address);
    if (!faucetOk) {
      console.log("\n⚠️  Financie a wallet manualmente:");
      console.log(`   1. Acesse https://faucet.circle.com`);
      console.log(`   2. Selecione "Arc Testnet"`);
      console.log(`   3. Envie USDC para: ${wallet.address}`);
      console.log(`   4. Execute novamente: npm run deploy:testnet\n`);
    }
    const funded = await waitForFunds(wallet.address, faucetOk ? 300 : 300);
    if (!funded) {
      console.error("\n❌ Wallet sem USDC para gas. Financie e execute novamente.");
      process.exit(1);
    }
  } else {
    log("2/5", `Saldo: ${ethers.formatUnits(balance, 18)} USDC`);
  }

  await runMigrations();

  const { agentId, txHash } = await registerOnChain();

  // Update .env with AGENT_ID
  const fs = await import("fs/promises");
  const envPath = path.resolve(__dirname, "../.env");
  let envContent = await fs.readFile(envPath, "utf-8");
  if (/^AGENT_ID=.*/m.test(envContent)) {
    envContent = envContent.replace(/^AGENT_ID=.*/m, `AGENT_ID=${agentId}`);
  } else {
    envContent += `\nAGENT_ID=${agentId}\n`;
  }
  await fs.writeFile(envPath, envContent);

  log("5/5", "Deploy concluído!");
  console.log("\n" + "=".repeat(60));
  console.log(`  Agent ID:    ${agentId}`);
  console.log(`  TX Hash:     ${txHash}`);
  console.log(`  Explorer:    https://testnet.arcscan.app/address/${IDENTITY}`);
  console.log(`  Iniciar API: npm run dev`);
  console.log("=".repeat(60) + "\n");
}

main().catch((err) => {
  console.error("\n❌ Deploy falhou:", err.message ?? err);
  process.exit(1);
});
