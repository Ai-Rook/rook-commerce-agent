# KeeperHub Starter Template: Zero to First Transaction in 15 Minutes

> **You are a new builder.** You've never used KeeperHub before. This template gets you from nothing to a confirmed onchain transaction on Base in 15 minutes.

## What You'll Build

A simple Node.js script that:
1. Connects to KeeperHub's MCP server
2. Finds your execution wallet
3. Simulates a USDC transfer (dry run)
4. Executes the transfer onchain
5. Prints your transaction hash

## Prerequisites

- Node.js 22+ installed
- A KeeperHub account (free — sign up at app.keeperhub.com)
- A small amount of USDC on Base (~$1 is plenty)
- A small amount of ETH on Base for gas (~$0.10)

## Step 1: Get Your KeeperHub API Key (2 minutes)

1. Go to app.keeperhub.com and sign up
2. Navigate to Settings → API Keys
3. Click "Create API Key"
4. Copy the key — it starts with `kh_`

## Step 2: Install Dependencies (1 minute)

```bash
mkdir keeperhub-starter && cd keeperhub-starter
npm init -y
npm install dotenv
```

> **Why just dotenv?** This template uses Node's built-in `fetch()` — no SDK needed. KeeperHub MCP is a standard HTTP JSON-RPC server.

## Step 3: Set Up Environment (1 minute)

Create a `.env` file:

```bash
KEEPERHUB_API_KEY=kh_your_api_key_here
KEEPERHUB_MCP_URL=https://app.keeperhub.com/mcp
```

## Step 4: The Script (5 minutes)

Create `index.js` and paste this:

```javascript
require("dotenv").config();

const MCP_URL = process.env.KEEPERHUB_MCP_URL;
const API_KEY = process.env.KEEPERHUB_API_KEY;

// ─── MCP Helper ───
// KeeperHub MCP uses JSON-RPC over HTTP.
// After calling `initialize`, you MUST:
//   1. Capture the session ID from the RESPONSE HEADERS (not the body)
//   2. Send a `notifications/initialized` message
//   3. Include the session ID header on all subsequent calls

async function mcpCall(method, params, sessionId) {
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${API_KEY}`,
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;

  const res = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });

  // Capture session ID from headers on first call
  const newSessionId = res.headers.get("mcp-session-id") || sessionId;

  return { data: await res.json(), sessionId: newSessionId };
}

// ─── Main Flow ───

async function main() {
  console.log("🚀 KeeperHub Starter — Zero to First Transaction\n");

  // Step 1: Initialize MCP connection
  console.log("[1] Connecting to KeeperHub MCP...");
  const { sessionId } = await mcpCall("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "starter-template", version: "1.0.0" },
  });
  console.log("    ✅ Connected — session established");

  // Step 2: Send initialized notification (REQUIRED before tool calls)
  await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
      "mcp-session-id": sessionId,
    },
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
  });

  // Step 3: Find your execution wallet
  console.log("\n[2] Finding your execution wallet...");
  const { data: intData } = await mcpCall("tools/call", {
    name: "list_integrations",
    arguments: {},
  }, sessionId);

  const integrations = JSON.parse(intData.result.content[0].text);
  const wallet = integrations[0];
  console.log(`    ✅ Execution wallet: ${wallet.address}`);
  console.log("    ⚠️  Fund THIS address with USDC + ETH on Base (not your CLI wallet!)");

  // Step 4: Simulate a transfer (dry run — no gas, no signing)
  console.log("\n[3] Simulating USDC transfer...");
  const { data: simData } = await mcpCall("tools/call", {
    name: "execute_transfer",
    arguments: {
      chain_id: "8453",                                    // Base mainnet
      to_address: wallet.address,                          // Send to yourself
      amount: "0.001",                                     // $0.001 USDC
      token_address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
      simulate: true,                                      // Dry run!
    },
  }, sessionId);

  const simText = simData.result.content[0].text;
  if (simData.result.isError) {
    console.log("    ❌ Simulation failed:", simText);
    console.log("    → Make sure your execution wallet has USDC + ETH for gas");
    return;
  }
  console.log("    ✅ Simulation passed — safe to execute");

  // Step 5: Execute for real
  console.log("\n[4] Executing onchain transfer...");
  const { data: execData } = await mcpCall("tools/call", {
    name: "execute_transfer",
    arguments: {
      chain_id: "8453",
      to_address: wallet.address,
      amount: "0.001",
      token_address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      // No simulate field — this is the real thing
    },
  }, sessionId);

  const execText = execData.result.content[0].text;
  const execResult = JSON.parse(execText);

  if (execResult.status === "failed") {
    console.log("    ❌ Execution failed:", execResult.error);
    return;
  }

  console.log("    ✅ Transaction submitted!");
  if (execResult.txHash) {
    console.log(`    🔗 https://basescan.org/tx/${execResult.txHash}`);
  } else if (execResult.executionId) {
    console.log(`    📋 Execution ID: ${execResult.executionId}`);
    console.log("    (Check KeeperHub dashboard for tx hash)");
  }

  console.log("\n🎉 You just executed an onchain transaction via KeeperHub!");
}

main().catch(console.error);
```

## Step 5: Run It (1 minute)

```bash
node index.js
```

You should see:
```
🚀 KeeperHub Starter — Zero to First Transaction

[1] Connecting to KeeperHub MCP...
    ✅ Connected — session established

[2] Finding your execution wallet...
    ✅ Execution wallet: 0xE5A3...
    ⚠️  Fund THIS address with USDC + ETH on Base (not your CLI wallet!)

[3] Simulating USDC transfer...
    ✅ Simulation passed — safe to execute

[4] Executing onchain transfer...
    ✅ Transaction submitted!
    🔗 https://basescan.org/tx/0x...

🎉 You just executed an onchain transaction via KeeperHub!
```

## Common Token Addresses

| Token | Chain | chain_id | token_address |
|---|---|---|---|
| ETH (native) | Base | 8453 | (omit token_address) |
| USDC | Base | 8453 | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 |
| USDC | Ethereum | 1 | 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 |
| WETH | Base | 8453 | 0x4200000000000000000000000000000000000006 |

## Gotchas (Read These)

1. **Two wallets exist** — the CLI wallet (`keeperhub-wallet add`) and the MCP execution wallet are different. Always check `list_integrations` to find the one MCP actually uses.

2. **Session ID is in headers, not body** — after calling `initialize`, grab `mcp-session-id` from the response headers. Without it, all subsequent calls fail silently.

3. **Always simulate first** — pass `simulate: true` before executing for real. It catches balance issues, wrong addresses, and would-be reverts for free.

4. **Field names matter** — the MCP schema uses `to_address` (not `to`), `chain_id` (not `network`), and `token_address` (not `token`). Call `tools/list` to see the exact schema.

5. **Fund the right wallet** — send USDC and ETH to the address returned by `list_integrations`, not the one from `keeperhub-wallet add`.

## Next Steps

- Add error handling and retries
- Call `execute_contract_call` to interact with a DeFi protocol
- Use `execute_check_and_execute` for conditional transactions
- Build an agent that reasons about when to transact (see the [Rook Commerce Agent](./rook-commerce-agent.js) for a full example)
