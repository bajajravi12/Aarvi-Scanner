import React from 'react';
import { Target, CheckCircle2, ShieldAlert, Zap, Clock, Activity } from 'lucide-react';
import { ScanProgress } from '../types';

interface HudMetricsProps {
  progress: ScanProgress;
  isScanning: boolean;
  statusMessage: string;
  avgLatency?: number;
}

export const HudMetrics: React.FC<HudMetricsProps> = ({
  progress,
  isScanning,
  statusMessage,
  avgLatency = 0,
}) => {
  const percentage = progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0;

  return (
    <div className="space-y-3">
      {/* Progress Bar & Status Text */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'}`} />
            <span className="text-slate-300 font-medium">{statusMessage || (isScanning ? 'Scanning in progress...' : 'Ready to scan')}</span>
          </span>
          <span className="text-cyan-400 font-semibold">{percentage}%</span>
        </div>

        {/* Cyber Progress Bar */}
        <div className="w-full h-2.5 bg-[#080d1a] rounded-full overflow-hidden border border-cyan-950/80 p-0.5 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-300 relative ${
              isScanning
                ? 'bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]'
                : 'bg-slate-700'
            }`}
            style={{ width: `${percentage}%` }}
          >
            {isScanning && (
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:16px_16px] animate-[progress-bar-stripes_1s_linear_infinite]" />
            )}
          </div>
        </div>
      </div>

      {/* HUD Metrics Grid (Cards) - Matching Kivy GridLayout cols: 3 + Performance extra */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Total Targets */}
        <div className="bg-[#0b101c] border border-slate-800/80 rounded-lg p-2.5 px-3 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Target className="w-3 h-3 text-slate-400" />
              <span>Total</span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-200 mt-0.5">
              {progress.total}
            </div>
          </div>
          <div className="text-xs text-slate-500 font-mono">Targets</div>
        </div>

        {/* Done / Scanned */}
        <div className="bg-[#0b101c] border border-slate-800/80 rounded-lg p-2.5 px-3 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-sky-400" />
              <span>Done</span>
            </div>
            <div className="text-lg font-bold font-mono text-sky-300 mt-0.5">
              {progress.done}
            </div>
          </div>
          <div className="text-xs text-slate-500 font-mono">{percentage}%</div>
        </div>

        {/* Verified Hits */}
        <div className={`border rounded-lg p-2.5 px-3 flex items-center justify-between shadow-sm transition-all ${
          progress.hits > 0
            ? 'bg-emerald-950/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
            : 'bg-[#0b101c] border-slate-800/80'
        }`}>
          <div>
            <div className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1 font-semibold">
              <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400/20" />
              <span>Hits</span>
            </div>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
              {progress.hits}
            </div>
          </div>
          <div className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-800/60">
            {progress.done > 0 ? `${((progress.hits / progress.done) * 100).toFixed(1)}%` : '0%'}
          </div>
        </div>

        {/* Avg Latency & Speed */}
        <div className="bg-[#0b101c] border border-slate-800/80 rounded-lg p-2.5 px-3 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Avg Latency</span>
            </div>
            <div className="text-lg font-bold font-mono text-amber-300 mt-0.5 flex items-center gap-1">
              <span>{avgLatency > 0 ? `${avgLatency}ms` : '--'}</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {progress.activeWorkers ? `${progress.activeWorkers}w` : 'idle'}
          </div>
        </div>
      </div>
    </div>
  );
};
