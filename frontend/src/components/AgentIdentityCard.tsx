"use client";

import type { AgentInfo, ReputationMetrics } from "@/lib/api";
import { truncateAddress } from "@/lib/api";

interface Props {
  agent: AgentInfo | null;
  reputation: ReputationMetrics | null;
}

export function AgentIdentityCard({ agent, reputation }: Props) {
  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Agent Identity</h2>
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${
            agent?.registered
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-amber-500/20 text-amber-400"
          }`}
        >
          ERC-8004
        </span>
      </div>

      {agent?.registered ? (
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-white/50">Name</dt>
            <dd className="font-medium">{agent.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/50">Version</dt>
            <dd>{agent.version}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/50">Agent ID</dt>
            <dd className="font-mono">{agent.agentId}</dd>
          </div>
          {agent.owner && (
            <div className="flex justify-between">
              <dt className="text-white/50">Owner</dt>
              <dd className="font-mono text-xs">{truncateAddress(agent.owner)}</dd>
            </div>
          )}
          <div>
            <dt className="text-white/50 mb-2">Capabilities</dt>
            <dd className="flex flex-wrap gap-2">
              {(agent.capabilities ?? []).map((cap) => (
                <span
                  key={cap}
                  className="px-2 py-1 rounded-lg bg-arc-600/20 text-arc-300 text-xs"
                >
                  {cap.replace(/_/g, " ")}
                </span>
              ))}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-white/60">
          {agent?.message ?? "Agent not registered on Arc Testnet yet."}
        </p>
      )}

      {reputation && (
        <div className="pt-4 border-t border-white/10">
          <h3 className="text-sm font-medium text-white/70 mb-3">Reputation</h3>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Score" value={`${reputation.reputationScore}/100`} />
            <Metric label="Evaluations" value={String(reputation.totalEvaluations)} />
            <Metric label="Successful" value={String(reputation.successfulEvaluations)} />
            <Metric
              label="Accuracy"
              value={`${reputation.averageAccuracy}%`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-3">
      <p className="text-xs text-white/50">{label}</p>
      <p className="text-lg font-semibold mt-0.5">{value}</p>
    </div>
  );
}
