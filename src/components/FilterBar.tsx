import React from 'react';
import { Search, Filter, ArrowUpDown, X } from 'lucide-react';
import { ScanFilter } from '../types';

interface FilterBarProps {
  filter: ScanFilter;
  onUpdateFilter: (updated: Partial<ScanFilter>) => void;
  totalHits: number;
  filteredHitsCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filter,
  onUpdateFilter,
  totalHits,
  filteredHitsCount,
}) => {
  const cdnOptions = ['ALL', 'CloudFront', 'Cloudflare', 'Fastly', 'Akamai'];
  const statusOptions = [
    { label: 'ALL', value: 'ALL' },
    { label: '200 OK', value: '200' },
    { label: '3xx Redirect', value: '3' },
    { label: '403 Forbidden', value: '403' },
    { label: '4xx / 5xx', value: 'error' },
  ];

  return (
    <div className="bg-[#0b101c] border border-slate-800 rounded-lg p-2.5 space-y-2">
      {/* Top row: Search input & Sorting */}
      <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filter.search}
            onChange={(e) => onUpdateFilter({ search: e.target.value })}
            placeholder="Search IP, server, via, header..."
            className="w-full bg-[#121927] text-slate-200 placeholder-slate-500 font-mono text-xs pl-8 pr-7 py-1.5 rounded border border-slate-700/80 focus:outline-none focus:border-cyan-400"
          />
          {filter.search && (
            <button
              onClick={() => onUpdateFilter({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort & Count */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sort:</span>
            <select
              value={filter.sortBy}
              onChange={(e) => onUpdateFilter({ sortBy: e.target.value as any })}
              className="bg-[#121927] text-slate-200 border border-slate-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="latest">Newest Found</option>
              <option value="latency">Fastest Ping (ms)</option>
              <option value="status">Status Code</option>
              <option value="ip">IP Address</option>
            </select>
          </div>

          <div className="text-[11px] font-mono text-slate-400 shrink-0">
            Showing <span className="text-cyan-300 font-bold">{filteredHitsCount}</span> of {totalHits}
          </div>
        </div>
      </div>

      {/* Filter Badges Row */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80 text-xs">
        {/* CDN Filter */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-mono text-slate-500 mr-1">CDN:</span>
          {cdnOptions.map((cdn) => {
            const isActive = filter.cdn.toUpperCase() === cdn.toUpperCase();
            return (
              <button
                key={cdn}
                onClick={() => onUpdateFilter({ cdn })}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-500/60 font-semibold'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cdn}
              </button>
            );
          })}
        </div>

        <span className="text-slate-700 hidden sm:inline">•</span>

        {/* Status Filter */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-mono text-slate-500 mr-1">Status:</span>
          {statusOptions.map((st) => {
            const isActive = filter.status === st.value;
            return (
              <button
                key={st.value}
                onClick={() => onUpdateFilter({ status: st.value })}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/60 font-semibold'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
