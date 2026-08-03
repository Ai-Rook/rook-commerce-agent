# From Zero to First Transaction: A KeeperHub Onboarding Teardown

## What This Is

I built an autonomous agent that pays for API intelligence via x402 micropayments and executes onchain actions through KeeperHub MCP. This is the unvarnished record of every wall I hit getting from zero to a confirmed onchain transaction — with proposed fixes for each.

**Time from "I have a KeeperHub account" to "first confirmed onchain tx": ~2 hours.**
With this guide: **~15 minutes.**

---

## Friction Point 1: Wallet Identity Mismatch

### What Happened
The KeeperHub CLI (`npx @keeperhub/wallet keeperhub-wallet add`) provisions a wallet and saves it to `~/.keeperhub/wallet.json`. I funded that wallet with 5 USDC on Base.

When I connected via MCP and called `execute_transfer`, it failed with "Insufficient USDC balance. Have: 0.0, Need: 0.001".

### Root Cause
The MCP server executes from a **different wallet** than the CLI provisions. The CLI created wallet `0xF3082fAf...` (which I funded), but the MCP server uses wallet `0xE5A347...` (which had $0).

These two wallets are not linked. The CLI wallet and the MCP wallet are separate integrations.

### Fix
After running `keeperhub-wallet add`, **also check which wallet the MCP server uses** by calling `list_integrations`:

```javascript
const intRes = await fetch(MCP_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`, "mcp-session-id": sessionId },
  body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_integrations", arguments: {} } }),
});
```

The response contains the actual execution wallet address. **Fund THAT address**, not the CLI wallet.

### Proposed PR
Add a note to the CLI output after `keeperhub-wallet add`:
```
⚠️  This wallet is for CLI use only. To execute via MCP, fund the wallet listed in your MCP integrations.
   Run `keeperhub-wallet info` or call `list_integrations` via MCP to find your execution wallet address.
```

---

## Friction Point 2: MCP Tool Schema — Missing Required Fields

### What Happened
Called `execute_transfer` with what seemed like reasonable arguments:
```json
{ "to": "0xF3082fAf...", "token": "USDC", "amount": "0.001", "network": "base" }
```

Got: `Input validation error: Invalid arguments for tool execute_transfer: expected string, code: invalid_type, path: ["chain_id"]`

### Root Cause
The actual required fields are **different from what the docs suggest**:

| What docs imply | What's actually required |
|---|---|
| `to` | `to_address` |
| `token` | `token_address` (ERC20 contract, not a symbol) |
| `network` | `chain_id` (string, e.g. "8453" not "base") |

The `tools/list` MCP response does include the JSON schema with correct field names, but the docs page uses different naming conventions.

### Fix
Always call `tools/list` first and read the `inputSchema` for the tool you want to use. The schema is the source of truth, not the docs.

### Proposed PR
Align docs naming with MCP schema field names. Add a "Quick Reference" table to the MCP docs showing the exact required fields for each execution tool:

```
execute_transfer (required):
  - chain_id: string (e.g. "8453" for Base, "1" for Ethereum)
  - to_address: string (0x... EVM or base58 Solana)
  - amount: string (human-readable, e.g. "0.001")

execute_transfer (optional):
  - token_address: string (ERC20 contract address; omit for native token)
  - simulate: boolean (simulate without broadcasting)
  - idempotency_key: string (dedup key, 24h window)
```

---

## Friction Point 3: No `simulate` Before Execute

### What Happened
Called `execute_transfer` directly. It failed with "Insufficient balance" — but the error message was the only signal. No pre-flight check.

### Root Cause
The `simulate` parameter exists in the schema but isn't mentioned in the quickstart guide. I only discovered it by reading the full `tools/list` schema.

### Fix
**Always simulate first.** The schema includes `simulate: true` which runs a dry-run without signing or broadcasting. This catches balance issues, wrong token addresses, and would-be reverts before you spend gas.

```javascript
// Step 1: Simulate
const simResult = await mcp.callTool("execute_transfer", {
  chain_id: "8453",
  to_address: targetAddress,
  amount: "0.001",
  token_address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  simulate: true,
});

if (simResult.result.isError) {
  console.error("Simulation failed:", simResult.result.content[0].text);
  return; // Don't execute for real
}

// Step 2: Execute (same args, no simulate field)
const execResult = await mcp.callTool("execute_transfer", {
  chain_id: "8453",
  to_address: targetAddress,
  amount: "0.001",
  token_address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
});
```

### Proposed PR
Add a "Always Simulate First" callout to the quickstart guide. The simulate flag is critical for new builders — it should be step 2, not buried in the schema.

---

## Friction Point 4: Session ID Not Obvious

### What Happened
Connected to the MCP server, called `initialize`, got a success response. Then called `tools/list` — got a 404 or empty response.

### Root Cause
The MCP server requires a session ID header (`mcp-session-id`) for all requests after `initialize`. The session ID is returned in the **response headers**, not the response body. If you're using `fetch()` and only reading `.json()`, you miss it.

### Fix
Capture the session ID from the response headers:
```javascript
const initRes = await fetch(MCP_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
  body: JSON.stringify({
    jsonrpc: "2.0", id: 1, method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "my-agent", version: "1.0.0" },
    },
  }),
});

// Session ID is in the HEADERS, not the body
const sessionId = initRes.headers.get("mcp-session-id");

// Send the initialized notification (required before tool calls)
await fetch(MCP_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
    "mcp-session-id": sessionId,
  },
  body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
});

// Now you can call tools — always include the session ID header
```

### Proposed PR
Add a "Connecting via HTTP" section to the MCP docs that shows the full 3-step handshake (initialize → initialized notification → tool call) with the session ID capture highlighted.

---

## Friction Point 5: USDC Token Address Not Documented

### What Happened
Wanted to transfer USDC. The schema says `token_address` is optional and takes an ERC20 contract address. But nowhere in the KeeperHub docs does it list common token addresses.

### Root Cause
KeeperHub expects you to know the ERC20 contract address for the token you want to transfer. For USDC on Base, that's `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`. A new builder likely doesn't have this memorized.

### Fix
Omit `token_address` for native ETH transfers. For ERC20 tokens, look up the address on Chainlist or the token's docs.

### Proposed PR
Add a "Common Token Addresses" reference table to the docs:

| Token | Chain | chain_id | token_address |
|---|---|---|---|
| ETH (native) | Ethereum | 1 | (omit) |
| ETH (native) | Base | 8453 | (omit) |
| USDC | Base | 8453 | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 |
| USDC | Ethereum | 1 | 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 |

---

## Summary: The 15-Minute Path

With the above knowledge, here's the fast path from zero to first transaction:

1. **Register** at app.keeperhub.com, create an API key (2 min)
2. **Connect MCP**: initialize → capture `mcp-session-id` from headers → send `notifications/initialized` (2 min)
3. **Find your exec wallet**: call `list_integrations`, read the `address` field (1 min)
4. **Fund it**: send a small amount of USDC + ETH (for gas) to that address on Base (2 min)
5. **Simulate**: call `execute_transfer` with `simulate: true` to verify balance and parameters (1 min)
6. **Execute**: call `execute_transfer` without `simulate`, get your tx hash (1 min)

Total: ~9 minutes of actual work + transaction confirmation time.

---

## About This Agent

The **Rook Commerce Agent** is an autonomous AI agent that:
1. Discovers paid API endpoints via the x402 protocol (reads `llms.txt`)
2. Pays for API intelligence with real USDC micropayments on Base ($0.001/call)
3. Analyzes the response for trading signals
4. Executes onchain actions through KeeperHub MCP based on the intelligence received
5. Reports a full audit trail: x402 payment tx + KeeperHub execution tx

Two real onchain transactions per run. Not a demo. Not a mockup.

**Confirmed transactions:**
- x402 payment: https://basescan.org/tx/0xe57f58ba4a953ee3edea7fd2acfbfcee307ca29ce329ceed3ac6ebef146f3bcd
- KeeperHub execution: https://basescan.org/tx/0x50e379e71811bdec8239d535ae715725617e8dc9db000ae5e7271449074bf4d5

---

*Built by Rook (Ai-Rook) for the KeeperHub Agents Onchain Hackathon, August 2026.*
