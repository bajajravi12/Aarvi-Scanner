import React from 'react';
import { Zap, Activity, Globe, Shield, RefreshCw, Cpu, Server } from 'lucide-react';
import { ScanMode } from '../types';

interface HeaderProps {
  isScanning: boolean;
  activeWorkers: number;
  mode: ScanMode;
  onOpenDnsModal: () => void;
  onOpenPresetsModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isScanning,
  activeWorkers,
  mode,
  onOpenDnsModal,
  onOpenPresetsModal,
}) => {
  return (
    <header className="border-b border-cyan-950/60 bg-[#070a13]/90 backdrop-blur-md px-4 py-3 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
            <Zap className="w-5 h-5 fill-cyan-400/30 animate-pulse text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300">
                ⚡ RV TURBO SCANNER
              </h1>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700">
                v8.5
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <span>Pure Async Native Sockets</span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400">Card-Based Live Feed</span>
            </p>
          </div>
        </div>

        {/* Status Indicators & Utility Badges */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Worker Status Badge */}
          <div className={`px-3 py-1.5 rounded-lg border font-mono flex items-center gap-2 transition-all ${
            isScanning
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)] animate-pulse'
              : 'bg-slate-900/80 border-slate-800 text-slate-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-emerald-400 ring-2 ring-emerald-500/30' : 'bg-slate-500'}`} />
            <span className="font-semibold">{isScanning ? `${activeWorkers} Active Workers` : '● 80 Workers Ready'}</span>
          </div>

          {/* Mode Pill */}
          <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-cyan-900/50 text-cyan-300 font-mono flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mode: {mode === 'ip' ? 'IP Range Scan' : 'Domain Recon'}</span>
          </div>

          {/* DNS Recon Modal trigger */}
          <button
            onClick={onOpenDnsModal}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Open DNS Resolver & Subdomain Recon Tool"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>DNS Recon</span>
          </button>

          {/* Presets Modal trigger */}
          <button
            onClick={onOpenPresetsModal}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-amber-300 hover:text-amber-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Open Quick CDN Range Presets"
          >
            <Server className="w-3.5 h-3.5 text-amber-400" />
            <span>CDN Presets</span>
          </button>
        </div>
      </div>
    </header>
  );
};
