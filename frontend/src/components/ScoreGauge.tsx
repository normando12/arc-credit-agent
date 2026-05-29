"use client";

import { riskBg, riskColor } from "@/lib/api";

interface Props {
  score: number;
  riskLevel: string;
  confidence: number;
}

export function ScoreGauge({ score, riskLevel, confidence }: Props) {
  const percentage = (score / 1000) * 100;
  const circumference = 2 * Math.PI * 90;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-52 h-52">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-white/10"
          />
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0c8ce9" />
              <stop offset="100%" stopColor="#36a7f8" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold tracking-tight">{score}</span>
          <span className="text-sm text-white/50 mt-1">/ 1000</span>
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium border ${riskBg(riskLevel)} ${riskColor(riskLevel)}`}
        >
          {riskLevel} RISK
        </span>
        <span className="px-3 py-1 rounded-full text-sm font-medium glass text-white/70">
          {confidence}% confidence
        </span>
      </div>
    </div>
  );
}
