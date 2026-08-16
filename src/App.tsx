/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { ControlPanel } from './components/ControlPanel';
import { HudMetrics } from './components/HudMetrics';
import { HitCard } from './components/HitCard';
import { FilterBar } from './components/FilterBar';
import { DnsReconModal } from './components/DnsReconModal';
import { ExportModal } from './components/ExportModal';
import { PresetSelector } from './components/PresetSelector';
import { HitItem, ScanMode, ScanProgress, ScanFilter, ScanPreset } from './types';
import { Activity, ShieldAlert, Sparkles, Volume2, VolumeX } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState<ScanMode>('ip');
  const [target, setTarget] = useState<string>('100.21.127.0/24');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to scan');
  const [hits, setHits] = useState<HitItem[]>([]);
  const [progress, setProgress] = useState<ScanProgress>({
    total: 0,
    done: 0,
    hits: 0,
    activeWorkers: 0,
  });

  // Scanner Config (Defaults mirror the Python v8.5 script)
  const [workers, setWorkers] = useState<number>(80);
  const [selectedPorts, setSelectedPorts] = useState<number[]>([80, 443, 8080, 8443]);
  const [customCfHost, setCustomCfHost] = useState<string>('newstatic.payu.in');
  const [customClHost, setCustomClHost] = useState<string>('cloudflare.com');
  const [timeout, setTimeoutVal] = useState<number>(2000);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Modals
  const [isDnsModalOpen, setIsDnsModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Filters & Sorting
  const [filter, setFilter] = useState<ScanFilter>({
    cdn: 'ALL',
    status: 'ALL',
    search: '',
    sortBy: 'latest',
  });

  // Refs for scan lifecycle
  const currentScanIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Beep sound generator for verified hits using Web Audio API
  const playHitSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1); // A6 note
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {}
  };

  const handleSetMode = (newMode: ScanMode) => {
    if (isScanning) return;
    setMode(newMode);
    if (newMode === 'ip') {
      setTarget('100.21.127.0/24');
    } else {
      setTarget('jio.com');
    }
  };

  const handleTogglePort = (port: number) => {
    if (selectedPorts.includes(port)) {
      if (selectedPorts.length > 1) {
        setSelectedPorts(selectedPorts.filter((p) => p !== port));
      }
    } else {
      setSelectedPorts([...selectedPorts, port]);
    }
  };

  const handleAddCustomPort = (port: number) => {
    if (!selectedPorts.includes(port)) {
      setSelectedPorts([...selectedPorts, port]);
    }
  };

  const handleRemoveCustomPort = (port: number) => {
    setSelectedPorts(selectedPorts.filter((p) => p !== port));
  };

  // Toggle Scan function mirroring Python logic
  const toggleScan = async () => {
    if (!isScanning) {
      const cleanTarget = target.trim();
      if (!cleanTarget) {
        setStatusMessage('Error: Please enter a target!');
        return;
      }

      setIsScanning(true);
      setHits([]);
      setProgress({
        total: 0,
        done: 0,
        hits: 0,
        activeWorkers: workers,
      });
      setStatusMessage('Scanning in progress...');

      const scanId = `scan_${Date.now()}`;
      currentScanIdRef.current = scanId;
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch('/api/scan/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scanId,
            mode,
            target: cleanTarget,
            workers,
            ports: selectedPorts,
            customDomains: {
              CloudFront: customCfHost.trim() || 'newstatic.payu.in',
              Cloudflare: customClHost.trim() || 'cloudflare.com',
            },
            timeout,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error('Failed to connect to scan worker pool');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const eventBlocks = buffer.split('\n\n');
          buffer = eventBlocks.pop() || '';

          for (const block of eventBlocks) {
            if (!block.trim()) continue;

            const lines = block.split('\n');
            let eventType = 'message';
            let eventDataStr = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.substring(7).trim();
              } else if (line.startsWith('data: ')) {
                eventDataStr = line.substring(6).trim();
              }
            }

            if (!eventDataStr) continue;

            try {
              const data = JSON.parse(eventDataStr);

              if (eventType === 'progress') {
                setProgress((prev) => ({
                  ...prev,
                  total: data.total ?? prev.total,
                  done: data.done ?? prev.done,
                  hits: data.hits ?? prev.hits,
                  activeWorkers: data.activeWorkers ?? prev.activeWorkers,
                  currentIp: data.currentIp,
                }));
              } else if (eventType === 'hit') {
                playHitSound();
                setHits((prev) => {
                  if (prev.some((item) => item.target === data.target)) {
                    return prev;
                  }
                  return [data, ...prev];
                });
                setProgress((prev) => ({
                  ...prev,
                  hits: prev.hits + 1,
                }));
              } else if (eventType === 'complete') {
                setIsScanning(false);
                setStatusMessage(data.status || `Scan Completed! Verified Hits: ${data.hits}`);
              } else if (eventType === 'error') {
                setIsScanning(false);
                setStatusMessage(`Error: ${data.message || 'Unknown scan error'}`);
              }
            } catch (parseErr) {
              console.error('SSE JSON parse error:', parseErr);
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setStatusMessage(`Scan failed: ${err.message || 'Network error'}`);
        }
      } finally {
        setIsScanning(false);
      }
    } else {
      // Stop scan requested by user
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (currentScanIdRef.current) {
        fetch('/api/scan/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scanId: currentScanIdRef.current }),
        }).catch(() => {});
      }
      setIsScanning(false);
      setStatusMessage('Scan stopped by user.');
    }
  };

  // Copy all hits formatted identically to Python script
  const copyAllHits = () => {
    if (hits.length === 0) {
      setStatusMessage('No hits to copy!');
      setCopyFeedback('No hits to copy!');
      setTimeout(() => setCopyFeedback(null), 2500);
      return;
    }

    const hitLines = hits.map(
      (h) => `${h.target} | ${h.status} | Server: ${h.server} | Via: ${h.via} | ${h.cdn}`
    );
    const content = hitLines.join('\n');
    navigator.clipboard.writeText(content);

    const msg = `Copied ${hits.length} hits to clipboard!`;
    setStatusMessage(msg);
    setCopyFeedback(msg);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const clearHits = () => {
    setHits([]);
    setProgress((prev) => ({ ...prev, hits: 0 }));
    setStatusMessage('Hits cleared.');
  };

  const handleSelectPreset = (preset: ScanPreset) => {
    setMode(preset.type);
    setTarget(preset.target);
    if (preset.recommendedPorts && preset.recommendedPorts.length > 0) {
      setSelectedPorts(preset.recommendedPorts);
    }
    if (preset.hostHeader) {
      if (preset.category === 'CloudFront') {
        setCustomCfHost(preset.hostHeader);
      } else if (preset.category === 'Cloudflare') {
        setCustomClHost(preset.hostHeader);
      }
    }
    setStatusMessage(`Loaded preset: ${preset.name}`);
  };

  // Calculate Average Latency
  const avgLatency = useMemo(() => {
    if (hits.length === 0) return 0;
    const total = hits.reduce((acc, curr) => acc + (curr.latencyMs || 0), 0);
    return Math.round(total / hits.length);
  }, [hits]);

  // Filtered and Sorted Hits Feed
  const filteredHits = useMemo(() => {
    return hits
      .filter((hit) => {
        // CDN Filter
        if (filter.cdn !== 'ALL') {
          if (!hit.cdn.toLowerCase().includes(filter.cdn.toLowerCase())) {
            return false;
          }
        }

        // Status Filter
        if (filter.status !== 'ALL') {
          if (filter.status === '200' && !hit.status.startsWith('2') && !hit.status.includes('OK')) {
            return false;
          }
          if (filter.status === '3' && !hit.status.startsWith('3')) {
            return false;
          }
          if (filter.status === '403' && !hit.status.includes('403')) {
            return false;
          }
          if (
            filter.status === 'error' &&
            !hit.status.startsWith('4') &&
            !hit.status.startsWith('5')
          ) {
            return false;
          }
        }

        // Search Filter
        if (filter.search.trim()) {
          const q = filter.search.toLowerCase();
          const matches =
            hit.target.toLowerCase().includes(q) ||
            hit.ip.toLowerCase().includes(q) ||
            hit.server.toLowerCase().includes(q) ||
            hit.via.toLowerCase().includes(q) ||
            hit.cdn.toLowerCase().includes(q) ||
            hit.status.toLowerCase().includes(q);
          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filter.sortBy === 'latency') {
          return a.latencyMs - b.latencyMs;
        }
        if (filter.sortBy === 'status') {
          return a.status.localeCompare(b.status);
        }
        if (filter.sortBy === 'ip') {
          return a.ip.localeCompare(b.ip);
        }
        // latest first default
        return b.timestamp - a.timestamp;
      });
  }, [hits, filter]);

  return (
    <div className="min-h-screen bg-[#04060a] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Header Bar */}
      <Header
        isScanning={isScanning}
        activeWorkers={progress.activeWorkers || workers}
        mode={mode}
        onOpenDnsModal={() => setIsDnsModalOpen(true)}
        onOpenPresetsModal={() => setIsPresetsModalOpen(true)}
      />

      {/* Main Container Layout matching Python Kivy MainLayout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 space-y-4">
        {/* Top Control Panel */}
        <ControlPanel
          mode={mode}
          onSetMode={handleSetMode}
          target={target}
          onSetTarget={setTarget}
          isScanning={isScanning}
          onToggleScan={toggleScan}
          onCopyAllHits={copyAllHits}
          onClearHits={clearHits}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          hitsCount={hits.length}
          workers={workers}
          onSetWorkers={setWorkers}
          selectedPorts={selectedPorts}
          onTogglePort={handleTogglePort}
          onAddCustomPort={handleAddCustomPort}
          onRemoveCustomPort={handleRemoveCustomPort}
          customCfHost={customCfHost}
          onSetCustomCfHost={setCustomCfHost}
          customClHost={customClHost}
          onSetCustomClHost={setCustomClHost}
          timeout={timeout}
          onSetTimeout={setTimeoutVal}
          copyFeedback={copyFeedback}
        />

        {/* HUD Metrics & Progress Bar Section */}
        <HudMetrics
          progress={progress}
          isScanning={isScanning}
          statusMessage={statusMessage}
          avgLatency={avgLatency}
        />

        {/* Live Matches Feed Section */}
        <div className="space-y-3 pt-2">
          {/* Feed Title & Utilities Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Live Matches Feed:</span>
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#101726] text-cyan-400 border border-cyan-900/50">
                {hits.length} Total Verified
              </span>
            </div>

            {/* Audio Toggle & Quick Actions */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-2 py-1 rounded border flex items-center gap-1 transition-colors cursor-pointer ${
                  soundEnabled
                    ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
                title="Toggle audio beep on verified hit"
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{soundEnabled ? 'Beep ON' : 'Beep OFF'}</span>
              </button>

              {hits.length > 0 && (
                <span className="text-slate-500 text-[11px]">
                  Showing latest real-time hits
                </span>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          {hits.length > 0 && (
            <FilterBar
              filter={filter}
              onUpdateFilter={(up) => setFilter({ ...filter, ...up })}
              totalHits={hits.length}
              filteredHitsCount={filteredHits.length}
            />
          )}

          {/* Live Cards Container */}
          <div className="space-y-2.5 min-h-[220px]">
            {filteredHits.length > 0 ? (
              <div className="space-y-2.5">
                {filteredHits.map((hit, index) => (
                  <HitCard key={hit.id || `${hit.target}-${index}`} hit={hit} index={index} />
                ))}
              </div>
            ) : (
              <div className="bg-[#0a0f1b]/70 border border-dashed border-slate-800 rounded-xl p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-slate-500">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="font-mono text-sm text-slate-300 font-semibold">
                    {isScanning
                      ? 'Probing socket targets in background...'
                      : hits.length > 0
                      ? 'No hits matched your current filter criteria'
                      : 'No live matches yet'}
                  </div>
                  <p className="text-xs font-mono text-slate-500 max-w-md mx-auto">
                    {isScanning
                      ? 'Matching CloudFront, Cloudflare, and custom edge responses will appear here dynamically as raw sockets verify headers.'
                      : 'Enter an IP range (e.g. 100.21.127.0/24) or choose a CDN preset, then click "Start Scan".'}
                  </p>
                </div>

                {!isScanning && hits.length === 0 && (
                  <div className="pt-2">
                    <button
                      onClick={() => setIsPresetsModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono border border-slate-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Browse Popular CDN Edge Pools</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#060911] px-4 py-3 text-center text-xs font-mono text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            RV Multi-CDN Turbo Scanner • Modern Card-UI Edition v8.5
          </div>
          <div className="text-slate-600">
            Raw TLS/TCP Socket Probe Engine • CloudFront & Cloudflare Anycast Recon
          </div>
        </div>
      </footer>

      {/* Modals */}
      <DnsReconModal
        isOpen={isDnsModalOpen}
        onClose={() => setIsDnsModalOpen(false)}
        onSelectTarget={(t, m) => {
          setMode(m);
          setTarget(t);
          setStatusMessage(`Selected ${m === 'ip' ? 'IP' : 'Domain'}: ${t}`);
        }}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        hits={hits}
      />

      <PresetSelector
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        onSelectPreset={handleSelectPreset}
      />
    </div>
  );
}
