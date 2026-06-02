"use client";



import type { WalletAnalysis, CreditScore } from "@/lib/api";

import { arcscanAddressUrl } from "@/lib/validation";

import { truncateAddress } from "@/lib/api";



interface Props {
  analysis: WalletAnalysis | null;
  score: CreditScore | null;
  onRequestValidation?: () => void;
  validating?: boolean;
  validationRequested?: boolean;
  canRequestValidation?: boolean;
  validationHint?: string | null;
}



export function AnalysisPanel({

  analysis,

  score,

  onRequestValidation,

  validating,

  validationRequested,

  canRequestValidation = false,

  validationHint,

}: Props) {

  if (!analysis && !score) {

    return (

      <div className="glass rounded-2xl p-8 text-center text-white/50">

        Enter a wallet address to analyze on-chain creditworthiness

      </div>

    );

  }



  return (

    <div className="space-y-6">

      {analysis && (

        <div className="glass rounded-2xl p-6 space-y-6">

          <div className="flex items-center justify-between gap-4">

            <h2 className="text-lg font-semibold">Wallet Analysis</h2>

            <a

              href={arcscanAddressUrl(analysis.wallet)}

              target="_blank"

              rel="noopener noreferrer"

              className="text-xs text-arc-400 hover:text-arc-300 font-mono underline underline-offset-2"

            >

              View on Arcscan ↗

            </a>

          </div>



          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

            <Stat label="Transactions" value={analysis.transactionCount} />

            <Stat label="Wallet Age" value={formatWalletAge(analysis.walletAgeDays)} />

            <Stat label="USDC Balance" value={formatUsdcAmount(analysis.balanceUsdc)} />

            <Stat label="First Activity" value={formatDate(analysis.firstActivityAt)} />

            <Stat label="Last Activity" value={formatDate(analysis.lastActivityAt)} />

            <Stat label="Unique Contracts" value={analysis.uniqueContracts} />

            <Stat label="Diversification" value={`${analysis.assetDiversificationScore}%`} />

            <Stat label="Consistency" value={`${analysis.transactionConsistencyScore}%`} />

            <Stat

              label="Suspicious Activity"

              value={analysis.suspiciousActivity ? "Yes" : "No"}

              alert={analysis.suspiciousActivity}

            />

          </div>



          <Section title="Detailed Activity">

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

              <Stat label="Analyzed At" value={formatDateTime(analysis.analyzedAt)} />

              <Stat label="Days Since Last Tx" value={daysSince(analysis.lastActivityAt)} />

              <Stat label="DeFi Protocols" value={analysis.defiProtocols.length} />

            </div>

          </Section>



          <Section title="DeFi & Protocols">

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">

              <Stat label="Staking" value={analysis.stakingInteractions} />

              <Stat label="Lending" value={analysis.lendingInteractions} />

              <Stat label="Liquidity Pools" value={analysis.liquidityPoolInteractions} />

              <Stat label="Governance" value={analysis.governanceInteractions} />

            </div>

            {analysis.defiProtocols.length > 0 ? (

              <div className="flex flex-wrap gap-2">

                {analysis.defiProtocols.map((p) => (

                  <span

                    key={p}

                    className="px-2 py-1 rounded-lg bg-arc-600/20 text-arc-300 text-xs"

                  >

                    {p}

                  </span>

                ))}

              </div>

            ) : (

              <p className="text-xs text-white/40">No DeFi protocols identified</p>

            )}

          </Section>



          {analysis.suspiciousFlags.length > 0 && (

            <Section title="Risk Alerts">

              <ul className="space-y-1">

                {analysis.suspiciousFlags.map((flag, i) => (

                  <li key={i} className="text-xs text-red-400 flex gap-2">

                    <span>⚠</span>

                    {flag}

                  </li>

                ))}

              </ul>

            </Section>

          )}



          <p className="text-xs text-white/30 font-mono">

            {truncateAddress(analysis.wallet)}

          </p>

        </div>

      )}



      {score && (

        <div className="glass rounded-2xl p-6">

          <h2 className="text-lg font-semibold mb-4">Score Explanation</h2>

          <ul className="space-y-2">

            {score.explanation.map((line, i) => (

              <li key={i} className="flex gap-3 text-sm text-white/80">

                <span className="text-arc-400 shrink-0">→</span>

                {line}

              </li>

            ))}

          </ul>

          {score.analysisId && onRequestValidation && !validationRequested && (
            <>
              <button
                onClick={onRequestValidation}
                disabled={validating || !canRequestValidation}
                className="mt-6 w-full py-2.5 rounded-xl bg-arc-600 hover:bg-arc-500 disabled:opacity-50 transition font-medium text-sm"
              >
                {validating ? "Signing transaction..." : "Request On-Chain Validation"}
              </button>
              {validationHint && (
                <p className="mt-3 text-xs text-amber-400 text-center">{validationHint}</p>
              )}
            </>
          )}

          {validationRequested && (

            <p className="mt-4 text-xs text-emerald-400 text-center">

              Validation submitted — see the transaction link in the panel below.

            </p>

          )}

        </div>

      )}

    </div>

  );

}



function Section({ title, children }: { title: string; children: React.ReactNode }) {

  return (

    <div>

      <h3 className="text-sm font-medium text-white/60 mb-3 uppercase tracking-wide">

        {title}

      </h3>

      {children}

    </div>

  );

}



function Stat({

  label,

  value,

  alert,

}: {

  label: string;

  value: string | number;

  alert?: boolean;

}) {

  return (

    <div className="bg-white/5 rounded-xl p-3">

      <p className="text-xs text-white/50">{label}</p>

      <p className={`text-base font-semibold mt-0.5 ${alert ? "text-red-400" : ""}`}>

        {value}

      </p>

    </div>

  );

}



function formatWalletAge(days: number): string {

  if (days === 0) return "< 1 day";

  if (days < 30) return `${days} days`;

  if (days < 365) return `${Math.round(days / 30)} months`;

  const years = Math.floor(days / 365);

  const months = Math.round((days % 365) / 30);

  return months > 0 ? `${years}y ${months}m` : `${years} years`;

}



function formatDate(iso: string | null): string {

  if (!iso) return "—";

  return new Date(iso).toLocaleDateString("en-US", {

    day: "2-digit",

    month: "short",

    year: "numeric",

  });

}



function formatDateTime(iso: string): string {

  return new Date(iso).toLocaleString("en-US", {

    day: "2-digit",

    month: "short",

    hour: "2-digit",

    minute: "2-digit",

  });

}



function daysSince(iso: string | null): string {

  if (!iso) return "—";

  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";

  if (days === 1) return "1 day";

  return `${days} days`;

}



function formatUsdcAmount(value: string): string {

  const n = parseFloat(value);

  if (!Number.isFinite(n) || n === 0) return "0.00 USDC";

  if (n >= 1) {

    return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;

  }

  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDC`;

}


