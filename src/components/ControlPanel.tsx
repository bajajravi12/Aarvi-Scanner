import React, { useState } from 'react';
import { Play, Square, Copy, Sliders, Check, Download, Trash2, Shield, Settings2, Plus, X } from 'lucide-react';
import { ScanMode, ScanPreset } from '../types';

interface ControlPanelProps {
  mode: ScanMode;
  onSetMode: (mode: ScanMode) => void;
  target: string;
  onSetTarget: (target: string) => void;
  isScanning: boolean;
  onToggleScan: () => void;
  onCopyAllHits: () => void;
  onClearHits: () => void;
  onOpenExportModal: () => void;
  hitsCount: number;
  // Advanced configs
  workers: number;
  onSetWorkers: (workers: number) => void;
  selectedPorts: number[];
  onTogglePort: (port: number) => void;
  onAddCustomPort: (port: number) => void;
  onRemoveCustomPort: (port: number) => void;
  customCfHost: string;
  onSetCustomCfHost: (host: string) => void;
  customClHost: string;
  onSetCustomClHost: (host: string) => void;
  timeout: number;
  onSetTimeout: (timeout: number) => void;
  copyFeedback: string | null;
}

const COMMON_PORTS = [80, 443, 8080, 8443, 2053, 2083, 2087, 2096];

const QUICK_PRESETS: { label: string; mode: ScanMode; target: string; note: string }[] = [
  { label: 'PayU CloudFront', mode: 'ip', target: '100.21.127.0/24', note: 'PayU CDN' },
  { label: 'Cloudflare Edge 1', mode: 'ip', target: '104.16.0.0/24', note: 'CF Anycast' },
  { label: 'Cloudflare Edge 2', mode: 'ip', target: '104.21.0.0/24', note: 'CF VIP' },
  { label: 'AWS CloudFront', mode: 'ip', target: '13.224.0.0/24', note: 'AWS Global' },
  { label: 'Jio Domain', mode: 'domain', target: 'jio.com', note: 'Domain Recon' },
  { label: 'PayU API Domain', mode: 'domain', target: 'api.payu.in', note: 'Domain Recon' },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  mode,
  onSetMode,
  target,
  onSetTarget,
  isScanning,
  onToggleScan,
  onCopyAllHits,
  onClearHits,
  onOpenExportModal,
  hitsCount,
  workers,
  onSetWorkers,
  selectedPorts,
  onTogglePort,
  onAddCustomPort,
  onRemoveCustomPort,
  customCfHost,
  onSetCustomCfHost,
  customClHost,
  onSetCustomClHost,
  timeout,
  onSetTimeout,
  copyFeedback,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newPortInput, setNewPortInput] = useState('');

  const handleAddPort = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(newPortInput, 10);
    if (!isNaN(p) && p > 0 && p <= 65535 && !selectedPorts.includes(p)) {
      onAddCustomPort(p);
      setNewPortInput('');
    }
  };

  return (
    <div className="space-y-3 bg-[#0a0f1b] border border-cyan-950/80 rounded-xl p-3.5 shadow-lg">
      {/* Mode Selector - Matching Kivy Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          id="btn-mode-ip"
          onClick={() => onSetMode('ip')}
          disabled={isScanning}
          className={`py-2.5 px-4 rounded-lg font-mono text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mode === 'ip'
              ? 'bg-[#0299e6] hover:bg-[#0288cc] text-white shadow-[0_0_15px_rgba(2,153,230,0.35)] border border-sky-400'
              : 'bg-[#1e293b] hover:bg-[#283548] text-slate-300 border border-slate-700'
          } ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span>🌐 IP Range Scan</span>
        </button>

        <button
          id="btn-mode-domain"
          onClick={() => onSetMode('domain')}
          disabled={isScanning}
          className={`py-2.5 px-4 rounded-lg font-mono text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mode === 'domain'
              ? 'bg-[#0299e6] hover:bg-[#0288cc] text-white shadow-[0_0_15px_rgba(2,153,230,0.35)] border border-sky-400'
              : 'bg-[#1e293b] hover:bg-[#283548] text-slate-300 border border-slate-700'
          } ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span>🔍 Domain Recon</span>
        </button>
      </div>

      {/* Target Input Field */}
      <div className="relative">
        <input
          id="target_input"
          type="text"
          value={target}
          onChange={(e) => onSetTarget(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onToggleScan();
            }
          }}
          disabled={isScanning}
          placeholder={
            mode === 'ip'
              ? 'Enter IP Range / CIDR (e.g. 100.21.127.0/24 or 104.16.1.1-50)'
              : 'Enter Domain (e.g. jio.com or api.payu.in)'
          }
          className={`w-full bg-[#141c2e] text-white placeholder-slate-500 font-mono text-sm px-4 py-3 rounded-lg border focus:outline-none transition-all ${
            isScanning
              ? 'border-slate-800 opacity-60 cursor-not-allowed'
              : 'border-cyan-900/60 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(56,189,248,0.25)]'
          }`}
        />
        {target && !isScanning && (
          <button
            onClick={() => onSetTarget('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Preset Badges */}
      {!isScanning && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-slate-500 text-[11px] font-mono shrink-0">Quick:</span>
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                onSetMode(preset.mode);
                onSetTarget(preset.target);
              }}
              className="px-2 py-1 rounded bg-[#0e1626] hover:bg-[#16233b] text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-800/80 font-mono text-[11px] shrink-0 transition-colors cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Action Buttons Row - Replicating Kivy layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Start / Stop Scan Button */}
        <button
          id="btn_action"
          onClick={onToggleScan}
          className={`py-3 px-4 rounded-lg font-mono text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
            isScanning
              ? 'bg-[#d93025] hover:bg-[#b3261e] text-white shadow-[0_0_15px_rgba(217,48,37,0.4)] animate-pulse'
              : 'bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-[0_0_15px_rgba(2,132,199,0.3)]'
          }`}
        >
          {isScanning ? (
            <>
              <Square className="w-4 h-4 fill-white" />
              <span>Stop Scan</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Start Scan</span>
            </>
          )}
        </button>

        {/* Copy All Hits Button */}
        <button
          id="btn_copy"
          onClick={onCopyAllHits}
          className="py-3 px-4 rounded-lg font-mono text-sm font-bold bg-[#0f9460] hover:bg-[#0c7a4f] text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(15,148,96,0.2)]"
        >
          <Copy className="w-4 h-4" />
          <span>Copy All Hits</span>
        </button>

        {/* Export Data Button */}
        <button
          onClick={onOpenExportModal}
          disabled={hitsCount === 0}
          className={`py-3 px-4 rounded-lg font-mono text-sm font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
            hitsCount > 0
              ? 'bg-[#182338] hover:bg-[#1f2e4a] text-cyan-300 border-cyan-800/80 hover:border-cyan-500/60 shadow-sm'
              : 'bg-[#101726] text-slate-600 border-slate-800 cursor-not-allowed'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Export ({hitsCount})</span>
        </button>

        {/* Advanced Settings Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`py-3 px-4 rounded-lg font-mono text-sm font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
            showAdvanced
              ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/60'
              : 'bg-[#141c2e] hover:bg-[#1b263e] text-slate-300 border-slate-700'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Config ({workers}w)</span>
        </button>
      </div>

      {/* Toast feedback notice */}
      {copyFeedback && (
        <div className="p-2 rounded bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{copyFeedback}</span>
          </div>
        </div>
      )}

      {/* Advanced Settings Drawer */}
      {showAdvanced && (
        <div className="pt-3 border-t border-cyan-950 space-y-4 animate-fadeIn">
          {/* Concurrency & Timeout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Workers Concurrency Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">Workers Concurrency:</span>
                <span className="text-cyan-400 font-bold">{workers} Threads</span>
              </div>
              <input
                type="range"
                min="10"
                max="120"
                step="5"
                value={workers}
                disabled={isScanning}
                onChange={(e) => onSetWorkers(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>10 (Gentle)</span>
                <span>80 (Turbo Default)</span>
                <span>120 (Extreme)</span>
              </div>
            </div>

            {/* Socket Timeout */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">Socket Probe Timeout:</span>
                <span className="text-amber-400 font-bold">{timeout} ms</span>
              </div>
              <input
                type="range"
                min="500"
                max="4000"
                step="250"
                value={timeout}
                disabled={isScanning}
                onChange={(e) => onSetTimeout(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>500ms (Fast)</span>
                <span>2000ms (Standard)</span>
                <span>4000ms (High Latency)</span>
              </div>
            </div>
          </div>

          {/* Port Selection Pills */}
          <div className="space-y-2">
            <span className="text-xs font-mono text-slate-300 block">Probed Ports (HTTP & TLS SNI):</span>
            <div className="flex flex-wrap gap-1.5 items-center">
              {COMMON_PORTS.map((port) => {
                const isSelected = selectedPorts.includes(port);
                return (
                  <button
                    key={port}
                    type="button"
                    disabled={isScanning}
                    onClick={() => onTogglePort(port)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-medium border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/60 shadow-[0_0_8px_rgba(56,189,248,0.2)]'
                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    {port} {port === 443 || port === 8443 ? '(SSL)' : ''}
                  </button>
                );
              })}

              {/* Custom Ports Added */}
              {selectedPorts
                .filter((p) => !COMMON_PORTS.includes(p))
                .map((port) => (
                  <span
                    key={port}
                    className="px-2.5 py-1 rounded text-xs font-mono font-medium bg-amber-950/40 text-amber-300 border border-amber-500/50 flex items-center gap-1"
                  >
                    <span>{port}</span>
                    {!isScanning && (
                      <button
                        onClick={() => onRemoveCustomPort(port)}
                        className="hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}

              {/* Add Custom Port Input */}
              {!isScanning && (
                <form onSubmit={handleAddPort} className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="+ Port"
                    value={newPortInput}
                    onChange={(e) => setNewPortInput(e.target.value)}
                    className="w-16 bg-slate-900 text-slate-200 placeholder-slate-600 font-mono text-xs px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Custom Host Header Targets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                CloudFront Host Header / SNI:
              </label>
              <input
                type="text"
                value={customCfHost}
                disabled={isScanning}
                onChange={(e) => onSetCustomCfHost(e.target.value)}
                placeholder="newstatic.payu.in"
                className="w-full bg-[#141c2e] text-slate-200 font-mono text-xs px-3 py-2 rounded border border-slate-800 focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Cloudflare Host Header / SNI:
              </label>
              <input
                type="text"
                value={customClHost}
                disabled={isScanning}
                onChange={(e) => onSetCustomClHost(e.target.value)}
                placeholder="cloudflare.com"
                className="w-full bg-[#141c2e] text-slate-200 font-mono text-xs px-3 py-2 rounded border border-slate-800 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Clear Hits Action */}
          {hitsCount > 0 && !isScanning && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={onClearHits}
                className="text-xs font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1.5 p-1.5 px-2.5 rounded bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/60 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Hits ({hitsCount})</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
