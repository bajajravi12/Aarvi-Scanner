export type ScanMode = 'ip' | 'domain';

export interface HitItem {
  id: string;
  target: string;
  ip: string;
  port: number;
  status: string;
  statusCode?: number;
  server: string;
  via: string;
  cdn: string;
  latencyMs: number;
  allHeaders?: Record<string, string>;
  protocol?: string;
  tlsInfo?: {
    cipher?: string;
    protocol?: string;
  };
  timestamp: number;
}

export interface ScanProgress {
  total: number;
  done: number;
  hits: number;
  activeWorkers?: number;
  currentIp?: string;
  speed?: number; // req/s
}

export interface ScanPreset {
  name: string;
  type: ScanMode;
  target: string;
  category: 'CloudFront' | 'Cloudflare' | 'Fastly' | 'Akamai' | 'Domain' | 'Custom';
  description: string;
  recommendedPorts: number[];
  hostHeader?: string;
}

export interface DnsLookupResult {
  domain: string;
  aRecords: string[];
  aaaaRecords: string[];
  cnameRecords: string[];
}

export interface ScanFilter {
  cdn: string;
  status: string;
  search: string;
  sortBy: 'latest' | 'latency' | 'status' | 'ip';
}
