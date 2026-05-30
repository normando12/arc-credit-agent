import { jsonOk } from "@/server/api-utils";
import { config } from "@backend/config/index";
import { getAgentWallet, getValidatorWallet } from "@backend/blockchain/provider";

export const runtime = "nodejs";

export async function GET() {
  const validator = getValidatorWallet();
  const agent = getAgentWallet();

  return jsonOk({
    validatorAddress: validator?.address ?? null,
    agentOwnerAddress: agent?.address ?? null,
    validationRegistry: config.contracts.validationRegistry,
    description:
      "The validator is a separate wallet from the agent owner (ERC-8004 rule). " +
      "Only this wallet can call validationResponse() to approve or reject scores.",
    configured: Boolean(validator),
  });
}
