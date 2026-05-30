import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import type { AgentMetadata } from "../types/index.js";

export class IpfsService {  async uploadJson(data: unknown, filename: string): Promise<string> {
    if (config.ipfs.pinataJwt) {
      return this.uploadToPinata(data, filename);
    }
    return this.storeLocally(data, filename);
  }

  private async uploadToPinata(data: unknown, filename: string): Promise<string> {
    const body = JSON.stringify(data);
    const blob = new Blob([body], { type: "application/json" });
    const formData = new FormData();
    formData.append("file", blob, filename);
    formData.append(
      "pinataMetadata",
      JSON.stringify({ name: filename })
    );

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.ipfs.pinataJwt}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Pinata upload failed: ${text}`);
    }

    const result = (await response.json()) as { IpfsHash: string };
    logger.info("Uploaded metadata to IPFS via Pinata", { cid: result.IpfsHash });
    return `ipfs://${result.IpfsHash}`;
  }

  private async storeLocally(data: unknown, filename: string): Promise<string> {
    const base64 = Buffer.from(JSON.stringify(data)).toString("base64");

    if (process.env.VERCEL) {
      logger.info("Stored metadata as data URI (Vercel serverless)", { filename });
      return `data:application/json;base64,${base64}`;
    }

    const fs = await import("fs/promises");
    const path = await import("path");

    const dir = path.join(process.cwd(), "backend", "data", "metadata");
    await fs.mkdir(dir, { recursive: true });

    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    logger.info("Stored metadata locally (no Pinata JWT configured)", { filePath });
    return `data:application/json;base64,${base64}`;
  }
  resolveUri(uri: string): string {
    if (uri.startsWith("ipfs://")) {
      return `${config.ipfs.gateway}${uri.slice(7)}`;
    }
    return uri;
  }

  buildAgentMetadata(
    agentId: number,
    agentRegistry: string,
    overrides?: Partial<AgentMetadata>
  ): AgentMetadata {
    return {
      type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
      name: config.agent.name,
      version: config.agent.version,
      description: config.agent.description,
      image: "ipfs://bafkreiaims435hmzeg3l6ixlrlvnei7wept5kmfd6c2ncz3ucl466xhucu",
      capabilities: ["wallet_analysis", "credit_scoring", "risk_assessment"],
      services: [
        {
          name: "REST API",
          endpoint: `${config.apiBaseUrl}/api/v1`,
          version: config.agent.version,
        },
        {
          name: "Credit Scoring",
          endpoint: `${config.apiBaseUrl}/api/v1/score`,
        },
      ],
      registrations: [{ agentId, agentRegistry }],
      supportedTrust: ["reputation", "validation"],
      ...overrides,
    };
  }
}

export const ipfsService = new IpfsService();
