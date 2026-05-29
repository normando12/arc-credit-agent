import { ethers } from "ethers";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function isValidAddress(address: string): boolean {
  return ADDRESS_REGEX.test(address);
}

export function normalizeAddress(address: string): string {
  if (!isValidAddress(address)) {
    throw new Error("Invalid Ethereum address");
  }
  return ethers.getAddress(address);
}

export function keccak256Json(data: unknown): string {
  const json = JSON.stringify(data, Object.keys(data as object).sort());
  return ethers.keccak256(ethers.toUtf8Bytes(json));
}

/** Arc USDC ERC-20 interface (balanceOf, transfer) uses 6 decimals */
export const USDC_ERC20_DECIMALS = 6;
/** Arc native USDC balance (getBalance, gas) uses 18 decimals */
export const USDC_NATIVE_DECIMALS = 18;

export function formatUsdcErc20Balance(balance: bigint): string {
  return ethers.formatUnits(balance, USDC_ERC20_DECIMALS);
}

export function formatUsdcNativeBalance(balance: bigint): string {
  return ethers.formatUnits(balance, USDC_NATIVE_DECIMALS);
}

/** Format Arc USDC from native balance (eth_getBalance) */
export function formatUsdcBalance(balance: bigint): string {
  return formatUsdcNativeBalance(balance);
}

export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function riskLevelFromScore(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score >= 750) return "LOW";
  if (score >= 500) return "MEDIUM";
  if (score >= 250) return "HIGH";
  return "CRITICAL";
}
