import React, { useState } from 'react';
import { Globe, X, Search, Check, Copy, ArrowRight, Server, Shield } from 'lucide-react';
import { DnsLookupResult } from '../types';

interface DnsReconModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTarget: (target: string, mode: 'ip' | 'domain') => void;
}

export const DnsReconModal: React.FC<DnsReconModalProps> = ({
  isOpen,
  onClose,
  onSelectTarget,
}) => {
  const [domainInput, setDomainInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DnsLookupResult | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleResolve = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!domainInput.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/recon/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'DNS Lookup failed');
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to query DNS');
    } finally {
      setLoading(false);
    }
  };

  const getSubnet = (ip: string) => {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts.slice(0, 3).join('.')}.0/24`;
    }
    return ip;
  };

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedIp(txt);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0c1220] border border-cyan-900/80 rounded-xl w-full max-w-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#080d17]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-950/80 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100 font-mono">Domain DNS Recon</h2>
              <p className="text-xs text-slate-400 font-mono">Resolve domain names to CDN IP pools</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 font-mono text-xs">
          <form onSubmit={handleResolve} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="Enter domain (e.g. jio.com, payu.in, fastly.com)"
                className="w-full bg-[#141c2e] text-white placeholder-slate-500 px-3.5 py-2.5 rounded-lg border border-slate-700 focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !domainInput.trim()}
              className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
            >
              {loading ? <Search className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Resolve</span>
            </button>
          </form>

          {/* Quick Domain Suggestions */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-slate-500 text-[11px]">Suggestions:</span>
            {['jio.com', 'newstatic.payu.in', 'cloudflare.com', 'airtel.in', 'fastly.com'].map((dom) => (
              <button
                key={dom}
                type="button"
                onClick={() => {
                  setDomainInput(dom);
                }}
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 text-[11px] cursor-pointer"
              >
                {dom}
              </button>
            ))}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* DNS Lookup Results */}
          {result && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="text-slate-300 font-semibold flex items-center justify-between">
                <span>Resolved Records for: <span className="text-cyan-300">{result.domain}</span></span>
                <button
                  onClick={() => {
                    onSelectTarget(result.domain, 'domain');
                    onClose();
                  }}
                  className="px-2 py-1 rounded bg-sky-950/70 text-sky-300 hover:bg-sky-900 border border-sky-600/50 text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <span>Recon Domain Directly</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* A Records (IPv4) */}
              <div className="space-y-1.5">
                <div className="text-slate-400 text-[11px]">A Records (IPv4 Addresses):</div>
                {result.aRecords.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {result.aRecords.map((ip) => {
                      const subnet = getSubnet(ip);
                      return (
                        <div
                          key={ip}
                          className="bg-[#121927] border border-slate-700/80 rounded-lg p-2.5 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[#facc15] font-bold text-sm select-all">{ip}</span>
                            <button
                              onClick={() => copyText(ip)}
                              className="text-slate-400 hover:text-slate-200"
                              title="Copy IP"
                            >
                              {copiedIp === ip ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Scan single IP */}
                            <button
                              onClick={() => {
                                onSelectTarget(ip, 'ip');
                                onClose();
                              }}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] cursor-pointer"
                            >
                              Scan IP
                            </button>

                            {/* Scan /24 Subnet */}
                            <button
                              onClick={() => {
                                onSelectTarget(subnet, 'ip');
                                onClose();
                              }}
                              className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-600/50 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <span>Scan /24</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-slate-500 italic p-2 bg-[#121927] rounded">No IPv4 (A) records found</div>
                )}
              </div>

              {/* CNAME Records */}
              {result.cnameRecords && result.cnameRecords.length > 0 && (
                <div className="space-y-1">
                  <div className="text-slate-400 text-[11px]">CNAME Aliases:</div>
                  <div className="bg-[#121927] border border-slate-800 rounded p-2 text-cyan-300">
                    {result.cnameRecords.join(', ')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
