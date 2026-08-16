import React, { useState, useEffect } from 'react';
import { Server, X, ArrowRight, ShieldCheck, Zap, Globe, Filter } from 'lucide-react';
import { ScanMode, ScanPreset } from '../types';

interface PresetSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: ScanPreset) => void;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
}) => {
  const [presets, setPresets] = useState<ScanPreset[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/presets')
        .then((res) => res.json())
        .then((data) => {
          if (data.presets) {
            setPresets(data.presets);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = ['ALL', 'CloudFront', 'Cloudflare', 'Fastly', 'Akamai', 'Domain'];

  const filteredPresets = presets.filter(
    (p) => categoryFilter === 'ALL' || p.category === categoryFilter
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0c1220] border border-cyan-900/80 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#080d17]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100 font-mono">Curated CDN & Recon Presets</h2>
              <p className="text-xs text-slate-400 font-mono">Pre-configured high-speed edge ranges and targets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="px-5 py-2.5 border-b border-slate-800 bg-[#0a0f1c] flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
          <span className="text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Filter:</span>
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-amber-950/70 text-amber-300 border border-amber-500/60 font-semibold'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Preset Cards List */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3 font-mono text-xs">
          {filteredPresets.map((preset, idx) => (
            <div
              key={idx}
              className="bg-[#121927] hover:bg-[#172133] border border-slate-700/80 hover:border-cyan-500/60 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-100 text-sm group-hover:text-cyan-300 transition-colors">
                    {preset.name}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-cyan-400 border border-cyan-900/50">
                    {preset.category}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 text-slate-400 border border-slate-800">
                    {preset.type === 'ip' ? 'IP Range' : 'Domain'}
                  </span>
                </div>

                <div className="text-slate-400 text-[11px]">{preset.description}</div>

                <div className="flex items-center gap-2 text-[11px] pt-1">
                  <span className="text-[#facc15] font-bold">{preset.target}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">
                    Ports: {preset.recommendedPorts.join(', ')}
                  </span>
                  {preset.hostHeader && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="text-sky-400">Host: {preset.hostHeader}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectPreset(preset);
                  onClose();
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-600/50 hover:border-cyan-400 font-bold flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                <span>Load Target</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#080d17] text-xs text-slate-500 font-mono flex items-center justify-between">
          <span>Target auto-fills input and selects recommended ports</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
