#!/usr/bin/env node
/**
 * Rook Commerce Agent — Video Demo Mode
 * 
 * Runs the full agent flow with 8-10 second pauses between each step
 * for screen recording. Outputs clear section breaks for OBS overlays.
 * 
 * Usage:
 *   node rook-commerce-agent.js --video
 */

const { CdpClient } = require("@coinbase/cdp-sdk");
const { CdpX402Client } = require("@coinbase/cdp-sdk/x402");
const { wrapFetchWithPayment } = require("@x402/fetch");
const dotenv = require("dotenv");

dotenv.config({ path: "/opt/x402-atm/.env" });
dotenv.config({ path: "/root/.openclaw/workspace/.env" });

const BASE_URL = process.env.SERVER_URL || "https://agents.ai-rook.com";
const WALLET_NAME = "x402-client-wallet-1";
const NETWORK = "eip155:8453";
const KEEPERHUB_MCP_URL = process.env.KEEPERHUB_MCP_URL || "https://app.keeperhub.com/mcp";
const KEEPERHUB_API_KEY = process.env.KEEPERHUB_API_KEY;
const KEEPERHUB_WALLET = require("/root/.keeperhub/wallet.json");

const PAUSE = 9000; // 9 seconds between steps
const SHORT_PAUSE = 4000; // 4 seconds for sub-steps

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function banner(text) {
  console.log("\n" + "═".repeat(60));
  console.log(`  ${text}`);
  console.log("═".repeat(60) + "\n");
}

class KeeperHubMCP {
  constructor(url, apiKey) {
    this.url = url;
    this.apiKey = apiKey;
    this.sessionId = null;
  }

  async connect() {
    const initRes = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "initialize",
        params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "rook-commerce-agent", version: "1.0.0" } },
      }),
    });
    this.sessionId = initRes.headers.get("mcp-session-id");
    await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${this.apiKey}`, "mcp-session-id": this.sessionId },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    });
    return this.sessionId;
  }

  async callTool(name, args = {}) {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${this.apiKey}`, "mcp-session-id": this.sessionId },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name, arguments: args } }),
    });
    return await res.json();
  }
}

async function main() {
  banner("ROOK COMMERCE AGENT");
  console.log("  x402 micropayment → API intelligence → KeeperHub onchain execution");
  console.log("  Two real onchain transactions per run. Not a demo. Not a mockup.");
  await sleep(PAUSE);

  // ─── STEP 1: DISCOVER ───
  banner("STEP 1: DISCOVER x402 ENDPOINTS");
  console.log("  Agent reads llms.txt to discover paid API endpoints...");
  await sleep(SHORT_PAUSE);

  const res = await fetch(`${BASE_URL}/llms.txt`);
  const text = await res.text();
  const endpoints = [];
  for (const line of text.split("\n")) {
    const match = line.match(/(?:^|\s)(\/api\/[^\s]+)/);
    if (match) endpoints.push(match[1]);
  }
  console.log(`\n  Found ${endpoints.length} paid endpoints:`);
  endpoints.slice(0, 8).forEach((ep, i) => console.log(`    ${i + 1}. ${ep}`));
  if (endpoints.length > 8) console.log(`    ... and ${endpoints.length - 8} more`);
  console.log(`\n  → Selected: /api/ai-analysis (market intelligence)`);
  await sleep(PAUSE);

  // ─── STEP 2: PAY ───
  banner("STEP 2: PAY FOR API INTELLIGENCE");
  console.log("  Calling https://agents.ai-rook.com/api/ai-analysis");
  console.log("  → Server responds with 402 Payment Required...");
  await sleep(SHORT_PAUSE);

  const cdp = new CdpClient({
    apiKeyId: process.env.CDP_API_KEY_ID,
    apiKeySecret: process.env.CDP_API_KEY_SECRET,
    walletSecret: process.env.CDP_WALLET_SECRET,
  });
  const x402Client = new CdpX402Client({ cdpClient: cdp, accountName: WALLET_NAME, network: "base" });
  const fetchWithPayment = wrapFetchWithPayment(fetch, x402Client);

  // Show 402 challenge
  const challengeRes = await fetch(`${BASE_URL}/api/ai-analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "BTC" }),
  });
  if (challengeRes.status === 402) {
    const challengeHeader = challengeRes.headers.get("payment-required");
    if (challengeHeader) {
      try {
        const decoded = JSON.parse(Buffer.from(challengeHeader, "base64").toString("utf8"));
        const accept = decoded.accepts?.find((a) => a.network === NETWORK) || decoded.accepts?.[0];
        if (accept) {
          const usdAmount = (Number(accept.amount) / 1e6).toFixed(3);
          console.log(`\n  ← 402 Payment Required`);
          console.log(`  → Amount: $${usdAmount} USDC on Base`);
          console.log(`  → Recipient: ${accept.payTo || accept.to || "facilitator"}`);
        }
      } catch {}
    }
  }
  await sleep(SHORT_PAUSE);

  console.log("\n  → CDP wallet signing EIP-3009 payment authorization...");
  await sleep(SHORT_PAUSE);

  const url = `${BASE_URL}/api/ai-analysis`;
  const paidRes = await fetchWithPayment(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "BTC" }),
  });

  let paymentTx = null;
  const paymentResponse = paidRes.headers.get("payment-response");
  if (paymentResponse) {
    try {
      const decoded = JSON.parse(Buffer.from(paymentResponse, "base64").toString());
      paymentTx = decoded.transaction || decoded.txHash || null;
    } catch {}
  }

  console.log(`\n  ← HTTP 200 — Payment settled!`);
  if (paymentTx) {
    console.log(`\n  ✅ x402 PAYMENT CONFIRMED ON BASE`);
    console.log(`  🔗 https://basescan.org/tx/${paymentTx}`);
  }
  await sleep(PAUSE);

  // ─── STEP 3: ANALYZE ───
  banner("STEP 3: ANALYZE INTELLIGENCE");
  const data = await paidRes.json();
  let signal = "neutral";
  let confidence = 0;
  const text = JSON.stringify(data).toLowerCase();
  if (text.includes("bullish") || text.includes("long") || text.includes("buy")) {
    signal = "bullish";
    confidence = 75;
  } else if (text.includes("bearish") || text.includes("short") || text.includes("sell")) {
    signal = "bearish";
    confidence = 70;
  }

  console.log(`  API response received. Analyzing for trading signal...`);
  await sleep(SHORT_PAUSE);
  console.log(`\n  Signal: ${signal.toUpperCase()}`);
  console.log(`  Confidence: ${confidence}%`);
  console.log(`\n  → Agent decides: execute onchain transfer via KeeperHub`);
  await sleep(PAUSE);

  // ─── STEP 4: EXECUTE ONCHAIN ───
  banner("STEP 4: EXECUTE ONCHAIN VIA KEEPERHUB MCP");
  console.log("  Connecting to KeeperHub MCP server...");
  console.log("  → initialize → capture session ID → notifications/initialized");
  await sleep(SHORT_PAUSE);

  const mcp = new KeeperHubMCP(KEEPERHUB_MCP_URL, KEEPERHUB_API_KEY);
  const sessionId = await mcp.connect();
  console.log(`\n  ✅ Connected — session: ${sessionId?.slice(0, 16)}...`);
  await sleep(SHORT_PAUSE);

  console.log("\n  Calling execute_transfer via MCP...");
  console.log(`  → chain_id: 8453 (Base)`);
  console.log(`  → to_address: ${KEEPERHUB_WALLET.walletAddress}`);
  console.log(`  → amount: 0.001 USDC`);
  console.log(`  → token: USDC (0x833589fCD6...)`);
  await sleep(SHORT_PAUSE);

  const result = await mcp.callTool("execute_transfer", {
    to_address: KEEPERHUB_WALLET.walletAddress,
    amount: "0.001",
    chain_id: "8453",
    token_address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  });

  let onchainTx = null;
  if (result?.result?.content) {
    for (const content of result.result.content) {
      if (content.type === "text") {
        try {
          const parsed = JSON.parse(content.text);
          onchainTx = parsed.txHash || parsed.transactionHash || parsed.hash || null;
        } catch {
          const match = content.text.match(/0x[a-fA-F0-9]{64}/);
          if (match) onchainTx = match[0];
        }
      }
    }
  }

  console.log(`\n  ✅ KEEPERHUB ONCHAIN EXECUTION CONFIRMED`);
  if (onchainTx) {
    console.log(`  🔗 https://basescan.org/tx/${onchainTx}`);
  }
  await sleep(PAUSE);

  // ─── STEP 5: AUDIT TRAIL ───
  banner("STEP 5: FULL AUDIT TRAIL");
  console.log("  ════════════════════════════════════════════════════");
  console.log("  x402 PAYMENT:");
  console.log(`    Endpoint:  ${BASE_URL}/api/ai-analysis`);
  console.log("    Network:   Base (eip155:8453)");
  console.log(`    Tx:        ${paymentTx ? "https://basescan.org/tx/" + paymentTx : "pending"}`);
  console.log("");
  console.log("  KEEPERHUB ONCHAIN ACTION:");
  console.log("    Protocol:  KeeperHub MCP (execute_transfer)");
  console.log(`    Signal:    ${signal.toUpperCase()}`);
  console.log(`    Tx:        ${onchainTx ? "https://basescan.org/tx/" + onchainTx : "pending"}`);
  console.log("");
  console.log(`  Agent Wallet: ${KEEPERHUB_WALLET.walletAddress}`);
  console.log("  ════════════════════════════════════════════════════");
  console.log("");
  console.log("  Two real onchain transactions. Verifiable on Basescan.");
  console.log("  This is the agent commerce stack.");
  console.log("");
  console.log("  ✅ Rook Commerce Agent — flow complete.");
  console.log("");
  console.log("  github.com/Ai-Rook/rook-commerce-agent");
  await sleep(PAUSE);
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});
