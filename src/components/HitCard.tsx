import React, { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, Terminal, Shield, ExternalLink, Zap } from 'lucide-react';
import { HitItem } from '../types';

interface HitCardProps {
  hit: HitItem;
  index: number;
}

export const HitCard: React.FC<HitCardProps> = ({ hit, index }) => {
  const [copied, setCopied] = useState(false);
  const [showHeaders, setShowHeaders] = useState(false);

  const copyHitLine = (e: React.MouseEvent) => {
    e.stopPropagation();
    const logLine = `${hit.target} | ${hit.status} | Server: ${hit.server} | Via: ${hit.via} | ${hit.cdn}`;
    navigator.clipboard.writeText(logLine);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCurl = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isSSL = hit.port === 443 || hit.port === 8443 || hit.port === 2053 || hit.port === 2083 || hit.port === 2087 || hit.port === 2096;
    const protocol = isSSL ? 'https' : 'http';
    const hostHeader = hit.cdn === 'CloudFront' ? 'newstatic.payu.in' : hit.cdn === 'Cloudflare' ? 'cloudflare.com' : 'example.com';
    const curlCmd = `curl -I -k "${protocol}://${hit.ip}:${hit.port}/" -H "Host: ${hostHeader}" -H "User-Agent: Mozilla/5.0 (RV-Scanner/8.5)"`;
    navigator.clipboard.writeText(curlCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Status color logic
  const is2xx = hit.status.startsWith('2') || hit.status.includes('OK');
  const is3xx = hit.status.startsWith('3') || hit.status.includes('Moved') || hit.status.includes('Found');
  const is4xx = hit.status.startsWith('4') || hit.status.includes('Forbidden') || hit.status.includes('Not Found');

  const statusColorClass = is2xx
    ? 'text-emerald-400 font-semibold'
    : is3xx
    ? 'text-sky-400 font-medium'
    : is4xx
    ? 'text-amber-400 font-medium'
    : 'text-rose-400 font-medium';

  // CDN badge colors
  const cdnColorClass = hit.cdn.toLowerCase().includes('cloudfront')
    ? 'bg-amber-950/40 text-amber-300 border-amber-500/40'
    : hit.cdn.toLowerCase().includes('cloudflare')
    ? 'bg-sky-950/40 text-sky-300 border-sky-500/40'
    : hit.cdn.toLowerCase().includes('fastly')
    ? 'bg-rose-950/40 text-rose-300 border-rose-500/40'
    : hit.cdn.toLowerCase().includes('akamai')
    ? 'bg-blue-950/40 text-blue-300 border-blue-500/40'
    : 'bg-cyan-950/40 text-cyan-300 border-cyan-500/40';

  return (
    <div
      id={`hit-card-${index}`}
      className="bg-[#121927] hover:bg-[#162033] border border-[#38bdf8]/40 hover:border-[#38bdf8]/80 rounded-lg p-3 transition-all duration-150 shadow-[0_2px_10px_rgba(0,0,0,0.3)] hover:shadow-[0_0_15px_rgba(56,189,248,0.15)] group"
    >
      {/* Top Line: Target (Bold Amber) & CDN Tag (Cyan) */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-mono font-bold text-[14px] sm:text-[15px] text-[#facc15] tracking-tight group-hover:text-amber-300 transition-colors select-all">
            {hit.target}
          </span>
          
          {/* Latency Pill */}
          {hit.latencyMs > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900/90 text-slate-300 border border-slate-700/80 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-amber-400" />
              <span>{hit.latencyMs}ms</span>
            </span>
          )}

          {hit.protocol && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900/60 text-slate-400 border border-slate-800 hidden sm:inline-block">
              {hit.protocol}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* CDN Badge (Cyan Accent) */}
          <span className={`text-[12px] font-bold font-mono px-2 py-0.5 rounded border ${cdnColorClass}`}>
            {hit.cdn}
          </span>

          {/* Quick Copy Action */}
          <button
            onClick={copyHitLine}
            className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 transition-colors cursor-pointer"
            title="Copy hit details"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Middle Line: Status & Server */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-[12px] font-mono mb-1">
        <div className="flex items-center gap-1 truncate">
          <span className="text-[#10b981] font-semibold">Status:</span>
          <span className={`${statusColorClass} truncate`}>{hit.status}</span>
        </div>

        <div className="flex items-center gap-1 truncate">
          <span className="text-[#94a3b8]">Server:</span>
          <span className="text-white font-medium truncate">{hit.server || 'Unknown'}</span>
        </div>
      </div>

      {/* Bottom Line: Via Header */}
      <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between gap-2 pt-0.5 border-t border-slate-800/60">
        <div className="truncate">
          <span className="text-[#64748b]">Via: </span>
          <span className="text-slate-300 truncate">{hit.via || 'None'}</span>
        </div>

        {/* Expand Details Button */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={copyCurl}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
            title="Copy cURL Command"
          >
            <Terminal className="w-2.5 h-2.5 text-cyan-400" />
            <span>cURL</span>
          </button>

          {hit.allHeaders && Object.keys(hit.allHeaders).length > 0 && (
            <button
              onClick={() => setShowHeaders(!showHeaders)}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 flex items-center gap-0.5 cursor-pointer transition-colors"
            >
              <span>Headers</span>
              {showHeaders ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Raw Headers Drawer */}
      {showHeaders && hit.allHeaders && (
        <div className="mt-2.5 pt-2 border-t border-cyan-950 bg-[#0a0f1b] rounded p-2.5 font-mono text-[11px] text-slate-300 space-y-1 overflow-x-auto shadow-inner">
          <div className="text-[10px] uppercase font-bold text-cyan-400 flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5">
            <span>Raw HTTP Response Headers</span>
            {hit.tlsInfo?.cipher && (
              <span className="text-slate-400 font-normal">
                TLS: {hit.tlsInfo.protocol || 'TLS'} ({hit.tlsInfo.cipher})
              </span>
            )}
          </div>
          {Object.entries(hit.allHeaders).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-sky-400 font-semibold shrink-0">{k}:</span>
              <span className="text-slate-200 break-all">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
