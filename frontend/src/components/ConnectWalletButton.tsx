"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { ARC_CHAIN_ID } from "@/lib/arc-chain";
import { truncateAddress } from "@/lib/api";

export function ConnectWalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const onArcTestnet = chainId === ARC_CHAIN_ID;
  const injectedConnector = connectors[0];

  if (!isConnected) {
    return (
      <button
        type="button"
        onClick={() => injectedConnector && connect({ connector: injectedConnector })}
        disabled={!injectedConnector || isConnecting}
        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 disabled:opacity-50 transition text-sm font-medium"
      >
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!onArcTestnet && (
        <button
          type="button"
          onClick={() => switchChain({ chainId: ARC_CHAIN_ID })}
          disabled={isSwitching}
          className="px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 disabled:opacity-50 transition text-xs font-medium"
        >
          {isSwitching ? "Switching..." : "Switch to Arc Testnet"}
        </button>
      )}
      <button
        type="button"
        onClick={() => disconnect()}
        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-xs font-mono text-white/80"
        title={address}
      >
        {onArcTestnet ? truncateAddress(address!) : truncateAddress(address!)}
      </button>
    </div>
  );
}
