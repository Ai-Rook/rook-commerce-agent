# Tutorial: Build Your First Onchain Agent with KeeperHub

> **Time to complete:** 15 minutes
> **Skill level:** Beginner — no blockchain experience required
> **What you'll build:** A Node.js script that connects to KeeperHub MCP and executes a real USDC transfer on Base

---

## What is KeeperHub?

KeeperHub is an execution layer for AI agents. Instead of your agent calling raw smart contracts and managing gas/nonces/MEV manually, KeeperHub handles all of that through a single MCP (Model Context Protocol) server.

Think of it as: **your agent decides → KeeperHub executes.**

## What You'll Need

- **Node.js 22+** — check with `node --version`
- **A KeeperHub account** — free, sign up at [app.keeperhub.com](https://app.keeperhub.com)
- **$1 USDC on Base** — for the actual transfer (you'll send it to yourself)
- **$0.10 ETH on Base** — for gas fees

Don't have USDC or ETH? You can use Base Sepolia (testnet) — get free testnet ETH from the [Base Sepolia Faucet](https://www.sepoliafaucet.com/), then swap for testnet USDC.

---

## Step 1: Create Your KeeperHub Account (2 min)

1. Go to [app.keeperhub.com](https://app.keeperhub.com)
2. Sign up with your email
3. Verify your email — a wallet is automatically provisioned for you

That's it. No private keys to manage, no seed phrases to write down.

## Step 2: Get Your API Key (1 min)

1. Click your **profile icon** (top right) → **Settings**
2. Navigate to **API Keys** → **Organisation** tab
3. Click **Create API Key**
4. Copy the key — it starts with `kh_`

> ⚠️ **Keep this key safe.** It grants access to your KeeperHub organization and wallet.

## Step 3: Find Your Execution Wallet (1 min)

Your KeeperHub account has a wallet that the MCP server uses to execute transactions. You need to find its address and fund it.

**Option A: Via the UI**
1. Click your profile icon → **Wallet**
2. Copy the wallet address (starts with `0x...`)

**Option B: Via MCP** (if you have Claude Code or any MCP client)
```
claude mcp add --transport http keeperhub https://app.keeperhub.com/mcp \
  --header "Authorization: Bearer kh_your_key_here"
```
Then call `list_integrations` to see your wallet address.

## Step 4: Fund Your Wallet (2 min)

Send a small amount to your KeeperHub wallet address on **Base** (not Ethereum mainnet — gas is too expensive there):

- **0.5-1 USDC** — for the transfer
- **0.001-0.01 ETH** — for gas

You can bridge to Base via [bridge.base.org](https://bridge.base.org) or buy directly on a DEX.

> ⚠️ **Important:** If you also installed the `@keeperhub/wallet` CLI, that creates a SEPARATE wallet. The CLI wallet and the MCP execution wallet are different addresses. Always fund the one shown in your KeeperHub dashboard or via `list_integrations`.

## Step 5: Set Up Your Project (1 min)

```bash
mkdir keeperhub-tutorial && cd keeperhub-tutorial
npm init -y
npm install dotenv
```

Create a `.env` file:
```bash
KEEPERHUB_API_KEY=kh_you…here
KEEPERHUB_MCP_URL=https://app.keeperhub.com/mcp
```

## Step 6: Write the Script (5 min)

Create `index.js`:

```javascript
require("dotenv").config();

const MCP_URL = process.env.KEEPERHUB_MCP_URL;
const API_KEY = process.env.KEEPERHUB_API_KEY;

// ─── MCP Helper ───
// KeeperHub MCP uses JSON-RPC 2.0 over HTTP.
// After calling `initialize`, you MUST:
//   1. Capture the session ID from the RESPONSE HEADERS
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

  // Session ID is in the HEADERS, not the response body
  const newSessionId = res.headers.get("mcp-session-id") || sessionId;
  return { data: await res.json(), sessionId: newSessionId };
}

// ─── Main Flow ───

async function main() {
  console.log("🚀 KeeperHub Tutorial — First Onchain Transaction\n");

  // 1. Initialize MCP connection
  console.log("[1/5] Connecting to KeeperHub MCP...");
  const { sessionId } = await mcpCall("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "my-first-agent", version: "1.0.0" },
  });
  console.log("      ✅ Connected!");

  // 2. Send initialized notification (required before tool calls)
  await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
      "mcp-session-id": sessionId,
    },
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
  });

  // 3. Find your execution wallet
  console.log("\n[2/5] Finding your execution wallet...");
  const { data: intData } = await mcpCall("tools/call", {
    name: "list_integrations",
    arguments: {},
  }, sessionId);

  const integrations = JSON.parse(intData.result.content[0].text);
  const wallet = integrations[0];
  console.log(`      Wallet: ${wallet.address}`);

  // 4. Simulate a USDC transfer (dry run — no gas, no signing)
  console.log("\n[3/5] Simulating USDC transfer...");
  const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

  const { data: simData } = await mcpCall("tools/call", {
    name: "execute_transfer",
    arguments: {
      chain_id: "8453",           // Base mainnet (as a STRING, not number)
      to_address: wallet.address, // Send to yourself
      amount: "0.001",            // $0.001 USDC
      token_address: USDC_BASE,   // USDC contract on Base
      simulate: true,             // Dry run!
    },
  }, sessionId);

  if (simData.result.isError) {
    console.log("      ❌ Simulation failed:", simData.result.content[0].text);
    console.log("      → Make sure your wallet has USDC + ETH for gas on Base");
    return;
  }
  console.log("      ✅ Simulation passed — safe to execute");

  // 5. Execute for real
  console.log("\n[4/5] Executing onchain transfer...");
  const { data: execData } = await mcpCall("tools/call", {
    name: "execute_transfer",
    arguments: {
      chain_id: "8453",
      to_address: wallet.address,
      amount: "0.001",
      token_address: USDC_BASE,
      // No simulate field — this is the real thing
    },
  }, sessionId);

  const execResult = JSON.parse(execData.result.content[0].text);

  if (execResult.status === "failed") {
    console.log("      ❌ Execution failed:", execResult.error);
    return;
  }

  console.log("      ✅ Transaction submitted!");

  // 6. Show the result
  console.log("\n[5/5] Result:");
  if (execResult.txHash) {
    console.log(`      🔗 https://basescan.org/tx/${execResult.txHash}`);
  } else if (execResult.executionId) {
    console.log(`      📋 Execution ID: ${execResult.executionId}`);
    console.log("      Check the KeeperHub dashboard for tx confirmation");
  }

  console.log("\n🎉 You just executed an onchain transaction via KeeperHub!");
}

main().catch(console.error);
```

## Step 7: Run It (1 min)

```bash
node index.js
```

**Expected output:**
```
🚀 KeeperHub Tutorial — First Onchain Transaction

[1/5] Connecting to KeeperHub MCP...
      ✅ Connected!

[2/5] Finding your execution wallet...
      Wallet: 0xE5A3...

[3/5] Simulating USDC transfer...
      ✅ Simulation passed — safe to execute

[4/5] Executing onchain transfer...
      ✅ Transaction submitted!

[5/5] Result:
      🔗 https://basescan.org/tx/0x...

🎉 You just executed an onchain transaction via KeeperHub!
```

**Copy the basescan link** — that's your real onchain transaction. Share it, verify it, celebrate.

---

## Troubleshooting

### "Simulation failed: Insufficient USDC balance"
Your execution wallet doesn't have enough USDC. Fund it with at least $0.01 USDC on Base.

### "Simulation failed: Insufficient gas"
Your execution wallet needs ETH for gas. Send at least 0.001 ETH to the wallet address on Base.

### "Bad credentials" or 401
Your API key is wrong or expired. Generate a new one at app.keeperhub.com → Settings → API Keys.

### "Session not found"
The MCP session expired (they last ~10 minutes of inactivity). Re-run the script to get a fresh session.

### No tx hash in the response
The transaction may still be confirming. Check the KeeperHub dashboard → Executions tab for the full status. The `executionId` can be queried via `get_execution`.

---

## What You Just Learned

1. **MCP handshake** — initialize → capture session ID from headers → send initialized notification → call tools
2. **Simulate before execute** — always pass `simulate: true` first to catch errors without spending gas
3. **The schema is the source of truth** — call `tools/list` to see exact field names for any tool
4. **Fund the right wallet** — the MCP execution wallet, not the CLI wallet

## Next Steps

- **Explore more tools** — call `tools/list` to see all 35+ available tools
- **Execute a contract call** — use `execute_contract_call` to interact with any smart contract
- **Conditional execution** — use `execute_check_and_execute` to check a condition before transacting
- **Build a full agent** — check out the [Rook Commerce Agent](https://github.com/Ai-Rook/rook-commerce-agent) for a production example that pays for API data via x402 and executes onchain via KeeperHub

---

*Built for the KeeperHub Agents Onchain Hackathon, August 2026.*
