export const ARC_EXPLORER =
  process.env.NEXT_PUBLIC_ARC_EXPLORER_URL ?? "https://testnet.arcscan.app";

export interface ValidationRecord {
  id?: string;
  requestHash: string;
  wallet: string;
  scoreId?: string;
  validatorAddress: string;
  status: "pending" | "approved" | "rejected" | "expired";
  txHash?: string;
  response?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ValidatorInfo {
  validatorAddress: string | null;
  agentOwnerAddress: string | null;
  validationRegistry: string;
  description: string;
  configured: boolean;
}

export function arcscanTxUrl(txHash: string): string {
  return `${ARC_EXPLORER}/tx/${txHash}`;
}

export function arcscanAddressUrl(address: string): string {
  return `${ARC_EXPLORER}/address/${address}`;
}

export function validationStatusLabel(status: string): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "expired":
      return "Expired";
    default:
      return "Pending";
  }
}

export function validationStatusColor(status: string): string {
  switch (status) {
    case "approved":
      return "bg-emerald-500/20 border-emerald-500/30 text-emerald-400";
    case "rejected":
      return "bg-red-500/20 border-red-500/30 text-red-400";
    case "expired":
      return "bg-gray-500/20 border-gray-500/30 text-gray-400";
    default:
      return "bg-amber-500/20 border-amber-500/30 text-amber-400";
  }
}
