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
      "O validador é uma wallet separada do dono do agente (regra ERC-8004). " +
      "Somente esta wallet pode chamar validationResponse() para aprovar ou rejeitar scores.",
    configured: Boolean(validator),
  });
}
