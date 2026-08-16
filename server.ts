import express from "express";
import path from "path";
import net from "net";
import tls from "tls";
import dns from "dns/promises";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

interface ProbeResult {
  status: string;
  statusCode: number;
  server: string;
  via: string;
  cdn: string;
  latencyMs: number;
  allHeaders: Record<string, string>;
  protocol?: string;
  tlsInfo?: {
    cipher?: string;
    protocol?: string;
  };
}

const SSL_PORTS = new Set([443, 8443, 2053, 2083, 2087, 2096]);
const DEFAULT_DOMAINS = {
  CloudFront: "newstatic.payu.in",
  Cloudflare: "cloudflare.com",
  Fastly: "fastly.com",
  Akamai: "akamai.com"
};

// Raw TCP/TLS HTTP probe mirroring Python's asyncio raw_http_probe
function rawHttpProbe(
  ip: string,
  domain: string,
  port: number,
  timeoutMs: number = 2000
): Promise<ProbeResult | null> {
  return new Promise((resolve) => {
    const isSSL = SSL_PORTS.has(port);
    const startTime = Date.now();
    let isResolved = false;

    const finalize = (result: ProbeResult | null) => {
      if (!isResolved) {
        isResolved = true;
        resolve(result);
      }
    };

    const reqPayload = 
      `HEAD / HTTP/1.1\r\n` +
      `Host: ${domain}\r\n` +
      `User-Agent: Mozilla/5.0 (RV-Scanner/8.5)\r\n` +
      `Accept: */*\r\n` +
      `Connection: close\r\n\r\n`;

    let socket: net.Socket | tls.TLSSocket;

    const timer = setTimeout(() => {
      try {
        socket?.destroy();
      } catch {}
      finalize(null);
    }, timeoutMs);

    try {
      if (isSSL) {
        socket = tls.connect(
          {
            host: ip,
            port: port,
            servername: domain,
            rejectUnauthorized: false,
            timeout: timeoutMs,
          },
          () => {
            try {
              socket.write(reqPayload);
            } catch {
              clearTimeout(timer);
              finalize(null);
            }
          }
        );
      } else {
        socket = net.connect(
          {
            host: ip,
            port: port,
            timeout: timeoutMs,
          },
          () => {
            try {
              socket.write(reqPayload);
            } catch {
              clearTimeout(timer);
              finalize(null);
            }
          }
        );
      }

      let receivedData = "";

      socket.on("data", (chunk) => {
        receivedData += chunk.toString("latin1");
        // We only need the HTTP headers
        if (receivedData.includes("\r\n\r\n") || receivedData.length >= 2048) {
          clearTimeout(timer);
          try {
            socket.end();
            socket.destroy();
          } catch {}
          processResponse(receivedData);
        }
      });

      socket.on("end", () => {
        clearTimeout(timer);
        processResponse(receivedData);
      });

      socket.on("timeout", () => {
        clearTimeout(timer);
        try {
          socket.destroy();
        } catch {}
        finalize(null);
      });

      socket.on("error", () => {
        clearTimeout(timer);
        try {
          socket.destroy();
        } catch {}
        finalize(null);
      });

      function processResponse(data: string) {
        if (!data || data.length === 0) {
          return finalize(null);
        }

        const latency = Date.now() - startTime;
        const lines = data.split("\r\n");
        const statusLine = lines[0] || "";

        if (!statusLine.startsWith("HTTP/")) {
          return finalize(null);
        }

        const statusClean = statusLine
          .replace(/^HTTP\/[0-9.]+\s+/, "")
          .trim();
        
        const statusCodeMatch = statusLine.match(/HTTP\/[0-9.]+\s+(\d+)/);
        const statusCode = statusCodeMatch ? parseInt(statusCodeMatch[1], 10) : 0;

        let serverH = "";
        let viaH = "";
        const allHeaders: Record<string, string> = {};

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line) break;
          const colonIdx = line.indexOf(":");
          if (colonIdx > 0) {
            const key = line.substring(0, colonIdx).trim().toLowerCase();
            const val = line.substring(colonIdx + 1).trim();
            allHeaders[key] = val;
            if (key === "server") {
              serverH = val;
            } else if (key === "via") {
              viaH = val;
            }
          }
        }

        // Fake ISP 302 filter / empty header filter as in original python script
        if (!serverH && !viaH && !allHeaders["cf-ray"] && !allHeaders["x-amz-cf-id"]) {
          return finalize(null);
        }

        // Classify CDN
        let detectedCdn = "CDN Match";
        const serverLower = serverH.toLowerCase();
        const viaLower = viaH.toLowerCase();

        if (serverLower.includes("cloudfront") || viaLower.includes("cloudfront") || allHeaders["x-amz-cf-id"]) {
          detectedCdn = "CloudFront";
        } else if (serverLower.includes("cloudflare") || viaLower.includes("cloudflare") || allHeaders["cf-ray"]) {
          detectedCdn = "Cloudflare";
        } else if (serverLower.includes("fastly") || viaLower.includes("varnish")) {
          detectedCdn = "Fastly";
        } else if (serverLower.includes("akamai") || serverLower.includes("akamaighost")) {
          detectedCdn = "Akamai";
        } else if (domain.toLowerCase().includes("payu") || domain.toLowerCase().includes("cloudfront")) {
          detectedCdn = "CloudFront";
        } else if (domain.toLowerCase().includes("cloudflare")) {
          detectedCdn = "Cloudflare";
        }

        let tlsInfo: { cipher?: string; protocol?: string } | undefined;
        if (isSSL && "getCipher" in socket && typeof (socket as tls.TLSSocket).getCipher === "function") {
          const cipher = (socket as tls.TLSSocket).getCipher();
          const protocol = (socket as tls.TLSSocket).getProtocol();
          if (cipher || protocol) {
            tlsInfo = {
              cipher: cipher?.name,
              protocol: protocol || undefined,
            };
          }
        }

        finalize({
          status: statusClean || `${statusCode}`,
          statusCode,
          server: serverH || "Unknown",
          via: viaH || "None",
          cdn: detectedCdn,
          latencyMs: latency,
          allHeaders,
          protocol: isSSL ? "HTTPS (TLS)" : "HTTP (Plain)",
          tlsInfo,
        });
      }
    } catch {
      clearTimeout(timer);
      finalize(null);
    }
  });
}

// IP Range Expansion helper
function expandTargetToIps(target: string): string[] {
  const ips: string[] = [];
  const cleanTarget = target.trim();

  // Range syntax: 104.16.1.1-50 or 100.21.127.1-254
  if (cleanTarget.includes("-") && !cleanTarget.includes("/")) {
    const [base, endPart] = cleanTarget.split("-");
    const baseParts = base.trim().split(".");
    if (baseParts.length === 4) {
      const startNum = parseInt(baseParts[3], 10);
      const endNum = parseInt(endPart.trim(), 10);
      const prefix = baseParts.slice(0, 3).join(".");
      if (!isNaN(startNum) && !isNaN(endNum) && startNum <= endNum && endNum <= 255) {
        // Cap single scan at 1024 IPs for browser safety
        const count = Math.min(endNum - startNum + 1, 1024);
        for (let i = startNum; i < startNum + count; i++) {
          ips.push(`${prefix}.${i}`);
        }
        return ips;
      }
    }
  }

  // CIDR syntax: 100.21.127.0/24, 104.16.0.0/24, 1.1.1.0/28
  if (cleanTarget.includes("/")) {
    const [ipStr, cidrStr] = cleanTarget.split("/");
    const cidr = parseInt(cidrStr, 10);
    const ipParts = ipStr.trim().split(".").map(Number);

    if (ipParts.length === 4 && !isNaN(cidr) && cidr >= 16 && cidr <= 32) {
      const ipNum =
        ((ipParts[0] << 24) >>> 0) +
        ((ipParts[1] << 16) >>> 0) +
        ((ipParts[2] << 8) >>> 0) +
        (ipParts[3] >>> 0);

      const mask = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
      const network = (ipNum & mask) >>> 0;
      const hostCount = Math.pow(2, 32 - cidr);
      
      // Limit to 1024 hosts max per scan request for container performance
      const effectiveCount = Math.min(hostCount, 1024);

      // If /24 or smaller, scan usable host IPs
      const startOffset = cidr >= 31 ? 0 : 1;
      const endOffset = cidr >= 31 ? effectiveCount : effectiveCount - 1;

      for (let i = startOffset; i < endOffset; i++) {
        const currentIpNum = (network + i) >>> 0;
        const o1 = (currentIpNum >>> 24) & 255;
        const o2 = (currentIpNum >>> 16) & 255;
        const o3 = (currentIpNum >>> 8) & 255;
        const o4 = currentIpNum & 255;
        ips.push(`${o1}.${o2}.${o3}.${o4}`);
      }
      return ips;
    }
  }

  // Single IP or domain
  return [cleanTarget];
}

// Active scan abort controllers
const activeScans = new Map<string, { abort: () => void }>();

// SSE Stream Scanner Endpoint
app.post("/api/scan/stream", (req, res) => {
  const {
    scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    mode = "ip", // "ip" | "domain"
    target = "",
    workers = 80,
    ports = [80, 443, 8080, 8443],
    customDomains = {
      CloudFront: "newstatic.payu.in",
      Cloudflare: "cloudflare.com"
    },
    timeout = 2000,
  } = req.body;

  if (!target || typeof target !== "string") {
    res.status(400).json({ error: "Missing or invalid target parameter." });
    return;
  }

  // Setup SSE Headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  const sendEvent = (event: string, data: any) => {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {}
  };

  let isCancelled = false;
  const abort = () => {
    isCancelled = true;
  };

  activeScans.set(scanId, { abort });

  req.on("close", () => {
    isCancelled = true;
    activeScans.delete(scanId);
  });

  (async () => {
    try {
      sendEvent("init", { scanId, message: "Initializing scan worker engine..." });

      if (mode === "domain") {
        // Domain Recon mode
        const cleanDomain = target
          .replace(/^https?:\/\//i, "")
          .split("/")[0]
          .trim();

        sendEvent("progress", {
          total: 1,
          done: 0,
          hits: 0,
          currentIp: cleanDomain,
          activeWorkers: 1,
        });

        // Test port 443 first then port 80
        let probe = await rawHttpProbe(cleanDomain, cleanDomain, 443, timeout);
        let usedPort = 443;
        if (!probe) {
          probe = await rawHttpProbe(cleanDomain, cleanDomain, 80, timeout);
          usedPort = 80;
        }

        let hitsCount = 0;
        if (probe) {
          hitsCount = 1;
          const hitData = {
            id: `hit_dom_${Date.now()}`,
            target: `${cleanDomain}:${usedPort}`,
            ip: cleanDomain,
            port: usedPort,
            status: probe.status,
            statusCode: probe.statusCode,
            server: probe.server,
            via: probe.via,
            cdn: probe.cdn,
            latencyMs: probe.latencyMs,
            allHeaders: probe.allHeaders,
            protocol: probe.protocol,
            tlsInfo: probe.tlsInfo,
            timestamp: Date.now(),
          };
          sendEvent("hit", hitData);
        }

        sendEvent("progress", {
          total: 1,
          done: 1,
          hits: hitsCount,
          currentIp: cleanDomain,
          activeWorkers: 0,
        });

        sendEvent("complete", {
          total: 1,
          done: 1,
          hits: hitsCount,
          status: hitsCount > 0 ? "Domain Verified!" : "No verified CDN response found.",
        });

        activeScans.delete(scanId);
        res.end();
        return;
      }

      // IP Range Scan mode
      const ips = expandTargetToIps(target);
      if (ips.length === 0) {
        sendEvent("error", { message: "Invalid IP Range / CIDR format." });
        res.end();
        return;
      }

      const totalIps = ips.length;
      let doneIps = 0;
      let hitsCount = 0;
      const seenTargets = new Set<string>();
      const cfDomain = customDomains.CloudFront || DEFAULT_DOMAINS.CloudFront;
      const clDomain = customDomains.Cloudflare || DEFAULT_DOMAINS.Cloudflare;
      const portList: number[] = Array.isArray(ports) && ports.length > 0 ? ports : [80, 443, 8080, 8443];

      sendEvent("progress", {
        total: totalIps,
        done: 0,
        hits: 0,
        activeWorkers: Math.min(workers, totalIps),
      });

      // Concurrency Pool Executor
      let currentIndex = 0;
      const concurrency = Math.min(Math.max(Number(workers) || 80, 1), 120);

      const scanWorker = async () => {
        while (currentIndex < ips.length && !isCancelled) {
          const myIndex = currentIndex++;
          if (myIndex >= ips.length) break;
          const ip = ips[myIndex];

          // Probe each configured port concurrently for this IP
          const portPromises = portList.map(async (port) => {
            if (isCancelled) return;
            const targetKey = `${ip}:${port}`;
            if (seenTargets.has(targetKey)) return;

            // Probe CloudFront and Cloudflare headers
            const [cfRes, clRes] = await Promise.all([
              rawHttpProbe(ip, cfDomain, port, timeout),
              rawHttpProbe(ip, clDomain, port, timeout),
            ]);

            const res = cfRes || clRes;
            const cdnType = cfRes
              ? cfRes.cdn || "CloudFront"
              : clRes
              ? clRes.cdn || "Cloudflare"
              : "";

            if (res && !isCancelled) {
              if (!seenTargets.has(targetKey)) {
                seenTargets.add(targetKey);
                hitsCount++;

                const hitItem = {
                  id: `hit_${ip.replace(/\./g, "_")}_${port}_${Date.now()}`,
                  target: targetKey,
                  ip,
                  port,
                  status: res.status,
                  statusCode: res.statusCode,
                  server: res.server,
                  via: res.via,
                  cdn: cdnType || res.cdn,
                  latencyMs: res.latencyMs,
                  allHeaders: res.allHeaders,
                  protocol: res.protocol,
                  tlsInfo: res.tlsInfo,
                  timestamp: Date.now(),
                };

                sendEvent("hit", hitItem);
              }
            }
          });

          await Promise.all(portPromises);

          doneIps++;

          // Send progress update periodically or at milestones
          if (doneIps % 5 === 0 || doneIps === totalIps || hitsCount > 0) {
            sendEvent("progress", {
              total: totalIps,
              done: doneIps,
              hits: hitsCount,
              currentIp: ip,
              activeWorkers: Math.min(concurrency, totalIps - doneIps),
            });
          }
        }
      };

      // Launch worker pool
      const workerPromises = [];
      for (let i = 0; i < concurrency; i++) {
        workerPromises.push(scanWorker());
      }

      await Promise.all(workerPromises);

      sendEvent("complete", {
        total: totalIps,
        done: doneIps,
        hits: hitsCount,
        status: isCancelled ? "Scan stopped by user." : `Scan Completed! Verified Hits: ${hitsCount}`,
      });

      activeScans.delete(scanId);
      res.end();
    } catch (err: any) {
      sendEvent("error", { message: err?.message || "Internal scan error" });
      activeScans.delete(scanId);
      res.end();
    }
  })();
});

// Cancel active scan endpoint
app.post("/api/scan/cancel", (req, res) => {
  const { scanId } = req.body;
  if (scanId && activeScans.has(scanId)) {
    activeScans.get(scanId)?.abort();
    activeScans.delete(scanId);
    res.json({ status: "cancelled", scanId });
  } else {
    // If no specific scanId, abort all
    for (const [id, scan] of activeScans.entries()) {
      scan.abort();
    }
    activeScans.clear();
    res.json({ status: "all_cancelled" });
  }
});

// DNS Recon Helper endpoint
app.post("/api/recon/dns", async (req, res) => {
  const { domain } = req.body;
  if (!domain || typeof domain !== "string") {
    res.status(400).json({ error: "Valid domain is required." });
    return;
  }

  const clean = domain.replace(/^https?:\/\//i, "").split("/")[0].trim();

  try {
    const results: {
      domain: string;
      aRecords: string[];
      aaaaRecords: string[];
      cnameRecords: string[];
    } = {
      domain: clean,
      aRecords: [],
      aaaaRecords: [],
      cnameRecords: [],
    };

    try {
      results.aRecords = await dns.resolve4(clean);
    } catch {}

    try {
      results.aaaaRecords = await dns.resolve6(clean);
    } catch {}

    try {
      results.cnameRecords = await dns.resolveCname(clean);
    } catch {}

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to resolve DNS records." });
  }
});

// Presets info endpoint
app.get("/api/presets", (req, res) => {
  res.json({
    presets: [
      {
        name: "PayU CloudFront Subnet",
        type: "ip",
        target: "100.21.127.0/24",
        category: "CloudFront",
        description: "Official PayU Payment Gateway CloudFront edge pool",
        recommendedPorts: [80, 443, 8080, 8443],
        hostHeader: "newstatic.payu.in"
      },
      {
        name: "Cloudflare Anycast Block 1",
        type: "ip",
        target: "104.16.0.0/24",
        category: "Cloudflare",
        description: "Cloudflare primary global Anycast proxy edge",
        recommendedPorts: [80, 443, 8080, 8443, 2053, 2083, 2087, 2096],
        hostHeader: "cloudflare.com"
      },
      {
        name: "Cloudflare Anycast Block 2",
        type: "ip",
        target: "104.21.0.0/24",
        category: "Cloudflare",
        description: "Cloudflare secondary Anycast VIP range",
        recommendedPorts: [80, 443, 8080, 8443],
        hostHeader: "cloudflare.com"
      },
      {
        name: "AWS CloudFront Global Pool",
        type: "ip",
        target: "13.224.0.0/24",
        category: "CloudFront",
        description: "Amazon CloudFront regional edge distribution range",
        recommendedPorts: [80, 443, 8443],
        hostHeader: "newstatic.payu.in"
      },
      {
        name: "Fastly CDN Anycast Block",
        type: "ip",
        target: "151.101.0.0/24",
        category: "Fastly",
        description: "Fastly global edge caching network range",
        recommendedPorts: [80, 443],
        hostHeader: "fastly.com"
      },
      {
        name: "Akamai Edge Suite",
        type: "ip",
        target: "23.32.0.0/24",
        category: "Akamai",
        description: "Akamai Ghost content delivery edge servers",
        recommendedPorts: [80, 443, 8080],
        hostHeader: "akamai.com"
      },
      {
        name: "Jio Recon Target",
        type: "domain",
        target: "jio.com",
        category: "Domain",
        description: "Reliance Jio telecom domain recon probe",
        recommendedPorts: [80, 443],
        hostHeader: "jio.com"
      },
      {
        name: "PayU API Edge",
        type: "domain",
        target: "api.payu.in",
        category: "Domain",
        description: "PayU India merchant API CDN edge check",
        recommendedPorts: [80, 443],
        hostHeader: "api.payu.in"
      }
    ]
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[RV TURBO SCANNER v8.5] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
