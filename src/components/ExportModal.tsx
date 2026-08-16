import React, { useState } from 'react';
import { Download, Copy, Check, X, FileText, Code, Table, Terminal } from 'lucide-react';
import { HitItem } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  hits: HitItem[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  hits,
}) => {
  const [format, setFormat] = useState<'log' | 'json' | 'csv' | 'ips' | 'curl'>('log');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateExportText = () => {
    switch (format) {
      case 'log':
        return hits
          .map((h) => `${h.target} | ${h.status} | Server: ${h.server} | Via: ${h.via} | ${h.cdn}`)
          .join('\n');
      case 'json':
        return JSON.stringify(hits, null, 2);
      case 'csv':
        const headers = ['Target', 'IP', 'Port', 'Status', 'Server', 'Via', 'CDN', 'LatencyMs', 'Timestamp'];
        const rows = hits.map((h) =>
          [
            `"${h.target}"`,
            `"${h.ip}"`,
            h.port,
            `"${h.status}"`,
            `"${h.server}"`,
            `"${h.via}"`,
            `"${h.cdn}"`,
            h.latencyMs,
            `"${new Date(h.timestamp).toISOString()}"`,
          ].join(',')
        );
        return [headers.join(','), ...rows].join('\n');
      case 'ips':
        return hits.map((h) => h.target).join('\n');
      case 'curl':
        return hits
          .map((h) => {
            const proto = h.port === 443 || h.port === 8443 ? 'https' : 'http';
            const hostH = h.cdn === 'CloudFront' ? 'newstatic.payu.in' : 'cloudflare.com';
            return `curl -I -k "${proto}://${h.ip}:${h.port}/" -H "Host: ${hostH}"`;
          })
          .join('\n');
    }
  };

  const exportText = generateExportText();

  const handleCopy = () => {
    navigator.clipboard.writeText(exportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `rv_scan_hits_${Date.now()}.${
      format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'txt'
    }`;
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0c1220] border border-cyan-900/80 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#080d17]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100 font-mono">Export Scan Results</h2>
              <p className="text-xs text-slate-400 font-mono">{hits.length} Verified Match Hits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Pills */}
        <div className="px-5 py-3 border-b border-slate-800/80 bg-[#0a0f1c] flex flex-wrap gap-2 items-center">
          <span className="text-xs font-mono text-slate-400 mr-1">Format:</span>

          <button
            onClick={() => setFormat('log')}
            className={`px-3 py-1 rounded text-xs font-mono border transition-colors cursor-pointer ${
              format === 'log'
                ? 'bg-cyan-950/70 text-cyan-300 border-cyan-500 font-bold'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Standard Log (.txt)
          </button>

          <button
            onClick={() => setFormat('ips')}
            className={`px-3 py-1 rounded text-xs font-mono border transition-colors cursor-pointer ${
              format === 'ips'
                ? 'bg-cyan-950/70 text-cyan-300 border-cyan-500 font-bold'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            IP:Port List
          </button>

          <button
            onClick={() => setFormat('json')}
            className={`px-3 py-1 rounded text-xs font-mono border transition-colors cursor-pointer ${
              format === 'json'
                ? 'bg-cyan-950/70 text-cyan-300 border-cyan-500 font-bold'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            JSON Array
          </button>

          <button
            onClick={() => setFormat('csv')}
            className={`px-3 py-1 rounded text-xs font-mono border transition-colors cursor-pointer ${
              format === 'csv'
                ? 'bg-cyan-950/70 text-cyan-300 border-cyan-500 font-bold'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            CSV Spreadsheet
          </button>

          <button
            onClick={() => setFormat('curl')}
            className={`px-3 py-1 rounded text-xs font-mono border transition-colors cursor-pointer ${
              format === 'curl'
                ? 'bg-cyan-950/70 text-cyan-300 border-cyan-500 font-bold'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            cURL Commands
          </button>
        </div>

        {/* Preview Code area */}
        <div className="p-5 flex-1 overflow-hidden flex flex-col">
          <div className="relative flex-1 bg-[#060a12] border border-slate-800 rounded-lg p-3 overflow-auto font-mono text-xs text-slate-300">
            <pre className="whitespace-pre-wrap select-all">{exportText}</pre>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#080d17] flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-mono">
            {hits.length} records ready to export
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-700"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
