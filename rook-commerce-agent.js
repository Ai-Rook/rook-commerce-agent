#!/usr/bin/env node
/**
 * Rook Commerce Agent — KeeperHub Agents Onchain Hackathon
 *
 * Flow:
 * 1. Discover x402 endpoints via llms.txt
 * 2. Call a paid endpoint (x402 payment via CDP wallet on Base)
 * 3. Receive market intelligence
 * 4. Execute onchain action via KeeperHub MCP
 * 5. Report tx hash + full audit trail
 *
 * Usage:
 *   node rook-commerce-agent.js                    # full flow, default endpoint
 *   node rook-commerce-agent.js --endpoint /api/ai-analysis  # specific endpoint
 *   node rook-commerce-agent.js --demo              # paced output for demo video
 */

const { CdpClient } = require("@coinbase/cdp-sdk");
const { CdpX402Client } = require("@coinbase/cdp-sdk/x402");
const { wrapFetchWithPayment } = require("@x402/fetch");
const dotenv = require("dotenv");

dotenv.config({ path: "/opt/x402-atm/.env" });
dotenv.config({ path: "/root/.openclaw/workspace/.env" }); // KeeperHub creds live here

// ─── Config ───
const BASE_URL = process.env.SERVER_URL || "https://agents.ai-rook.com";
const WALLET_NAME = "x402-client-wallet-1";
const NETWORK = "eip155:8453"; // Base
const KEEPERHUB_MCP_URL = process.env.KEEPERHUB_MCP_URL || "https://app.keeperhub.com/mcp";
const KEEPERHUB_API_KEY = process.env.KEEPERHUB_API_KEY;
const KEEPERHUB_WALLET = require("/root/.keeperhub/wallet.json");

const demoMode = process.argv.includes("--demo");
const endpointIdx = process.argv.indexOf("--endpoint");
const endpointArg = endpointIdx !== -1 ? process.argv[endpointIdx + 1] : null;
const targetEndpoint = endpointArg || "/api/ai-analysis";

const sleep = (ms) => demoMode ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();

// ─── KeeperHub MCP Client ───
class KeeperHubMCP {
  constructor(url, apiKey) {
    this.url = url;
    this.apiKey = apiKey;
    this.sessionId = null;
  }

  async connect() {
    // Initialize
    const initRes = await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "rook-commerce-agent", version: "1.0.0" },
        },
      }),
    });
    const initData = await initRes.json();
    this.sessionId = initRes.headers.get("mcp-session-id");

    // Initialized notification
    await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        "mcp-session-id": this.sessionId,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    });

    return this.sessionId;
  }

  async callTool(name, args = {}) {
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        "mcp-session-id": this.sessionId,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name, arguments: args },
      }),
    });
    return await res.json();
  }

  async listTools() {
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        "mcp-session-id": this.sessionId,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      }),
    });
    return await res.json();
  }
}

// ─── Step 1: Discover endpoints via llms.txt ───
async function discoverEndpoints() {
  console.log("[1] Discovering x402 endpoints from llms.txt...");
  const res = await fetch(`${BASE_URL}/llms.txt`);
  const text = await res.text();

  // Parse endpoints from llms.txt (lines like: ## /api/ai-analysis - description)
  const endpoints = [];
  for (const line of text.split("\n")) {
    const match = line.match(/(?:^|\s)(\/api\/[^\s]+)/);
    if (match) {
      endpoints.push(match[1]);
    }
  }
  console.log(`    Found ${endpoints.length} endpoints: ${endpoints.slice(0, 5).join(", ")}${endpoints.length > 5 ? "..." : ""}`);
  await sleep(1000);
  return endpoints;
}

// ─── Step 2: Pay for and call a x402 endpoint ───
async function buyIntel(fetchWithPayment, endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`[2] Calling paid endpoint: ${endpoint}`);
  console.log(`    → GET ${url}`);

  // First, show the 402 challenge
  const challengeRes = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: "BTC" }) });
  if (challengeRes.status === 402) {
    const challengeHeader = challengeRes.headers.get("payment-required");
    if (challengeHeader) {
      try {
        const decoded = JSON.parse(Buffer.from(challengeHeader, "base64").toString("utf8"));
        const accept = decoded.accepts?.find((a) => a.network === NETWORK) || decoded.accepts?.[0];
        if (accept) {
          const usdAmount = (Number(accept.amount) / 1e6).toFixed(3);
          console.log(`    ← 402 Payment Required`);
          console.log(`    → Paying $${usdAmount} USDC on Base to ${accept.payTo || accept.to || "facilitator"}`);
        }
      } catch (e) {
        console.log(`    ← 402 Payment Required (challenge decoded)`);
      }
    } else {
      console.log(`    ← 402 Payment Required`);
    }
  } else if (challengeRes.status === 200) {
    console.log(`    ← 200 (free endpoint or already paid)`);
  }
  await sleep(1000);

  // Now pay and fetch (POST with body)
  console.log(`    → Signing payment via CDP wallet...`);
  const res = await fetchWithPayment(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "BTC" }),
  });
  console.log(`    ← HTTP ${res.status}`);

  if (res.status !== 200) {
    const body = await res.text();
    throw new Error(`Payment failed: HTTP ${res.status} — ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const paymentResponse = res.headers.get("payment-response");
  let txHash = null;
  let payer = null;
  if (paymentResponse) {
    try {
      const decoded = JSON.parse(Buffer.from(paymentResponse, "base64").toString());
      txHash = decoded.transaction || decoded.txHash || null;
      payer = decoded.payer || null;
    } catch (e) {}
  }

  console.log(`    ✅ Payment settled on Base`);
  if (txHash) console.log(`    Tx: https://basescan.org/tx/${txHash}`);
  if (payer) console.log(`    Payer: ${payer}`);
  await sleep(1000);

  return { data, txHash, payer };
}

// ─── Step 3: Decide onchain action from intel ───
async function decideAction(data) {
  // Parse the API response for a trading signal
  let signal = "neutral";
  let confidence = 0;
  let summary = "No actionable signal";

  if (typeof data === "object") {
    // Try to extract a signal from common response shapes
    const text = JSON.stringify(data).toLowerCase();
    if (text.includes("bullish") || text.includes("long") || text.includes("buy")) {
      signal = "bullish";
      confidence = 75;
      summary = "Market intelligence indicates bullish sentiment";
    } else if (text.includes("bearish") || text.includes("short") || text.includes("sell")) {
      signal = "bearish";
      confidence = 70;
      summary = "Market intelligence indicates bearish sentiment";
    } else if (data.signal) {
      signal = data.signal;
      confidence = data.confidence || 60;
      summary = data.summary || `Signal: ${signal}`;
    } else {
      summary = "Received market data — executing conservative onchain action";
    }
  }

  console.log(`[3] Analyzing intelligence...`);
  console.log(`    Signal: ${signal} (confidence: ${confidence}%)`);
  console.log(`    Summary: ${summary}`);

  // Decide onchain action based on signal
  const action = {
    type: signal === "bullish" ? "execute_transfer" : "execute_transfer",
    params: {
      // Transfer a small amount of USDC as a demonstration of onchain execution
      // In production, this could be a contract call to a DEX, lending protocol, etc.
      to: KEEPERHUB_WALLET.walletAddress, // self-transfer to demonstrate onchain execution
      token: "USDC",
      amount: "0.001", // $0.001 USDC — minimal for demo
      network: "base",
    },
    reason: `${signal.toUpperCase()} signal received — executing onchain transfer via KeeperHub`,
  };

  console.log(`    → Action: ${action.type} (${action.reason})`);
  console.log(`    → Amount: ${action.params.amount} USDC to ${action.params.to.slice(0, 10)}...`);
  await sleep(1000);

  return action;
}

// ─── Step 4: Execute onchain via KeeperHub MCP ───
async function executeOnchain(mcp, action) {
  console.log(`[4] Executing onchain action via KeeperHub MCP...`);
  console.log(`    → Calling ${action.type}...`);

  const result = await mcp.callTool(action.type, {
    to_address: action.params.to,
    amount: action.params.amount,
    chain_id: "8453", // Base mainnet
    token_address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  });

  let txHash = null;
  let status = "unknown";

  if (result?.result?.content) {
    for (const content of result.result.content) {
      if (content.type === "text") {
        try {
          const parsed = JSON.parse(content.text);
          if (parsed.txHash || parsed.transactionHash || parsed.hash) {
            txHash = parsed.txHash || parsed.transactionHash || parsed.hash;
            status = parsed.status || "submitted";
          } else if (parsed.id || parsed.requestId) {
            // Async execution — poll for status
            const execId = parsed.id || parsed.requestId;
            console.log(`    → Execution queued: ${execId}`);
            await sleep(2000);

            // Poll for status
            const statusRes = await mcp.callTool("get_direct_execution_status", {
              executionId: execId,
            });
            if (statusRes?.result?.content) {
              for (const c of statusRes.result.content) {
                if (c.type === "text") {
                  try {
                    const statusParsed = JSON.parse(c.text);
                    txHash = statusParsed.txHash || statusParsed.transactionHash || null;
                    status = statusParsed.status || "unknown";
                  } catch {}
                }
              }
            }
          }
        } catch {
          // Plain text response
          if (content.text.includes("0x")) {
            const match = content.text.match(/0x[a-fA-F0-9]{64}/);
            if (match) txHash = match[0];
          }
          if (!txHash) {
            console.log(`    Response: ${content.text.slice(0, 200)}`);
          }
        }
      }
    }
  }

  console.log(`    ✅ Onchain execution ${status}`);
  if (txHash) {
    console.log(`    Tx: https://basescan.org/tx/${txHash}`);
  } else {
    console.log(`    (execution submitted — check KeeperHub dashboard for tx hash)`);
  }
  await sleep(1000);

  return { txHash, status };
}

// ─── Step 5: Full audit trail ───
function printAuditTrail(paymentTx, onchainTx, signal) {
  console.log(`\n[5] Full Audit Trail`);
  console.log(`    ═══════════════════════════════════════`);
  console.log(`    x402 Payment:`);
  console.log(`      Endpoint:  ${BASE_URL}${targetEndpoint}`);
  console.log(`      Network:   Base (eip155:8453)`);
  console.log(`      Tx:        ${paymentTx || "N/A"}`);
  console.log(`    Onchain Action:`);
  console.log(`      Protocol:   KeeperHub MCP`);
  console.log(`      Signal:    ${signal}`);
  console.log(`      Tx:        ${onchainTx || "pending"}`);
  console.log(`    Agent Wallet: ${KEEPERHUB_WALLET.walletAddress}`);
  console.log(`    ═══════════════════════════════════════`);
  console.log(`\n✅ Rook Commerce Agent — flow complete.\n`);
}

// ─── Main ───
async function main() {
  console.log("╔════════════════════════════════════════════╗");
  console.log("║  Rook Commerce Agent                       ║");
  console.log("║  x402 payment → KeeperHub onchain execution ║");
  console.log("╚════════════════════════════════════════════╝\n");

  // Setup CDP x402 payment client
  const cdp = new CdpClient({
    apiKeyId: process.env.CDP_API_KEY_ID,
    apiKeySecret: process.env.CDP_API_KEY_SECRET,
    walletSecret: process.env.CDP_WALLET_SECRET,
  });
  const x402Client = new CdpX402Client({
    cdpClient: cdp,
    accountName: WALLET_NAME,
    network: "base",
  });
  const fetchWithPayment = wrapFetchWithPayment(fetch, x402Client);

  // Setup KeeperHub MCP
  const mcp = new KeeperHubMCP(KEEPERHUB_MCP_URL, KEEPERHUB_API_KEY);

  // Step 1: Discover endpoints
  const endpoints = await discoverEndpoints();

  // Step 2: Buy intelligence from a paid endpoint
  const { data, txHash: paymentTx, payer } = await buyIntel(fetchWithPayment, targetEndpoint);

  // Step 3: Decide onchain action based on intelligence
  const action = await decideAction(data);
  const signal = action.reason;

  // Step 4: Connect to KeeperHub and execute onchain
  console.log(`[4] Connecting to KeeperHub MCP...`);
  const sessionId = await mcp.connect();
  console.log(`    Connected — session: ${sessionId?.slice(0, 12)}...`);
  await sleep(500);
  const { txHash: onchainTx, status } = await executeOnchain(mcp, action);

  // Step 5: Print audit trail
  printAuditTrail(
    paymentTx ? `https://basescan.org/tx/${paymentTx}` : null,
    onchainTx ? `https://basescan.org/tx/${onchainTx}` : null,
    signal
  );
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});
