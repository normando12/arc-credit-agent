"use client";

import { truncateAddress } from "@/lib/api";
import {
  arcscanAddressUrl,
  arcscanTxUrl,
  validationStatusLabel,
  validationStatusColor,
  type ValidationRecord,
  type ValidatorInfo,
} from "@/lib/validation";

interface Props {
  validation: ValidationRecord | null;
  validatorInfo: ValidatorInfo | null;
  apiOffline?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function ValidationPanel({
  validation,
  validatorInfo,
  apiOffline,
  onRefresh,
  refreshing,
}: Props) {
  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">On-Chain Validation (ERC-8004)</h2>
        <span className="text-xs text-white/40">ValidationRegistry</span>
      </div>

      <div className="bg-white/5 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-white/80">Who approves or rejects?</p>
        <p className="text-xs text-white/50 leading-relaxed">
          {validatorInfo?.description ??
            "An independent wallet from the agent owner, per ERC-8004 rules."}
        </p>
        {validatorInfo?.validatorAddress ? (
          <dl className="grid gap-2 text-sm">
            <Row
              label="Validator"
              value={validatorInfo.validatorAddress}
              href={arcscanAddressUrl(validatorInfo.validatorAddress)}
            />
            {validatorInfo.agentOwnerAddress && (
              <Row
                label="Agent Owner"
                value={validatorInfo.agentOwnerAddress}
                href={arcscanAddressUrl(validatorInfo.agentOwnerAddress)}
              />
            )}
            <Row
              label="Contract"
              value={truncateAddress(validatorInfo.validationRegistry)}
              href={arcscanAddressUrl(validatorInfo.validationRegistry)}
            />
          </dl>
        ) : apiOffline ? (
          <p className="text-xs text-amber-400">
            API offline — configure DATABASE_URL and agent keys in Vercel environment variables.
          </p>
        ) : (
          <p className="text-xs text-amber-400">
            VALIDATOR_PRIVATE_KEY not configured on the server.
          </p>
        )}
      </div>

      {validation ? (
        <div className="border border-white/10 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Request Submitted</p>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${validationStatusColor(validation.status)}`}
            >
              {validationStatusLabel(validation.status)}
            </span>
          </div>

          <dl className="space-y-2 text-sm">
            {validation.txHash && (
              <div>
                <dt className="text-white/50 text-xs mb-1">Arcscan Transaction</dt>
                <dd>
                  <a
                    href={arcscanTxUrl(validation.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-arc-400 hover:text-arc-300 font-mono text-xs break-all underline underline-offset-2"
                  >
                    {validation.txHash}
                    <span aria-hidden>↗</span>
                  </a>
                </dd>
              </div>
            )}

            <Row
              label="Assigned Validator"
              value={validation.validatorAddress}
              href={arcscanAddressUrl(validation.validatorAddress)}
            />

            <div>
              <dt className="text-white/50 text-xs mb-1">Request Hash (internal ID)</dt>
              <dd className="font-mono text-xs text-white/60 break-all">
                {validation.requestHash}
              </dd>
            </div>
          </dl>

          {validation.status === "pending" && (
            <p className="text-xs text-white/50">
              Waiting for the validator to sign{" "}
              <code className="text-arc-300">validationResponse()</code> on-chain.
            </p>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="text-xs text-arc-400 hover:text-arc-300 disabled:opacity-50"
            >
              {refreshing ? "Refreshing status..." : "Refresh on-chain status"}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-white/40 text-center py-4">
          Request validation after generating a score to see the Arcscan transaction.
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex justify-between items-start gap-4">
      <dt className="text-white/50 shrink-0">{label}</dt>
      <dd className="text-right">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-arc-400 hover:text-arc-300 underline underline-offset-2"
          >
            {truncateAddress(value)}
          </a>
        ) : (
          <span className="font-mono text-xs">{truncateAddress(value)}</span>
        )}
      </dd>
    </div>
  );
}
