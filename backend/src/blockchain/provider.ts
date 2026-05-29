import { ethers } from "ethers";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

let provider: ethers.JsonRpcProvider | null = null;
let wsProvider: ethers.WebSocketProvider | null = null;
let agentWallet: ethers.Wallet | null = null;
let validatorWallet: ethers.Wallet | null = null;

export function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(config.arc.rpcUrl, config.arc.chainId);
  }
  return provider;
}

export function getWsProvider(): ethers.WebSocketProvider {
  if (!wsProvider) {
    wsProvider = new ethers.WebSocketProvider(config.arc.wsUrl, config.arc.chainId);
  }
  return wsProvider;
}

export function getAgentWallet(): ethers.Wallet | null {
  if (!config.agent.privateKey) return null;
  if (!agentWallet) {
    agentWallet = new ethers.Wallet(config.agent.privateKey, getProvider());
  }
  return agentWallet;
}

export function getValidatorWallet(): ethers.Wallet | null {
  if (!config.agent.validatorPrivateKey) return null;
  if (!validatorWallet) {
    validatorWallet = new ethers.Wallet(config.agent.validatorPrivateKey, getProvider());
  }
  return validatorWallet;
}

export async function getNetworkStatus(): Promise<{
  chainId: number;
  blockNumber: number;
  connected: boolean;
}> {
  try {
    const p = getProvider();
    const [network, blockNumber] = await Promise.all([
      p.getNetwork(),
      p.getBlockNumber(),
    ]);
    return {
      chainId: Number(network.chainId),
      blockNumber,
      connected: true,
    };
  } catch (error) {
    logger.error("Failed to connect to Arc RPC", { error: String(error) });
    return { chainId: config.arc.chainId, blockNumber: 0, connected: false };
  }
}

export const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

export const IDENTITY_REGISTRY_ABI = [
  "function register(string agentURI) returns (uint256 agentId)",
  "function register() returns (uint256 agentId)",
  "function setAgentURI(uint256 agentId, string newURI)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function getAgentWallet(uint256 agentId) view returns (address)",
  "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)",
];

export const REPUTATION_REGISTRY_ABI = [
  "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)",
  "function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)",
  "function getClients(uint256 agentId) view returns (address[])",
  "function readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex) view returns (int128 value, uint8 valueDecimals, string tag1, string tag2, bool isRevoked)",
  "event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)",
];

export const VALIDATION_REGISTRY_ABI = [
  "function validationRequest(address validatorAddress, uint256 agentId, string requestURI, bytes32 requestHash)",
  "function validationResponse(bytes32 requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag)",
  "function getValidationStatus(bytes32 requestHash) view returns (address validatorAddress, uint256 agentId, uint8 response, bytes32 responseHash, string tag, uint256 lastUpdate)",
  "function getAgentValidations(uint256 agentId) view returns (bytes32[])",
  "event ValidationRequest(address indexed validatorAddress, uint256 indexed agentId, string requestURI, bytes32 indexed requestHash)",
  "event ValidationResponse(address indexed validatorAddress, uint256 indexed agentId, bytes32 indexed requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag)",
];

export function getIdentityRegistry(runner?: ethers.ContractRunner) {
  return new ethers.Contract(
    config.contracts.identityRegistry,
    IDENTITY_REGISTRY_ABI,
    runner ?? getProvider()
  );
}

export function getReputationRegistry(runner?: ethers.ContractRunner) {
  return new ethers.Contract(
    config.contracts.reputationRegistry,
    REPUTATION_REGISTRY_ABI,
    runner ?? getProvider()
  );
}

export function getValidationRegistry(runner?: ethers.ContractRunner) {
  return new ethers.Contract(
    config.contracts.validationRegistry,
    VALIDATION_REGISTRY_ABI,
    runner ?? getProvider()
  );
}
