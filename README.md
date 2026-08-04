# Rook Commerce Agent

> Autonomous AI agent that pays for API intelligence via x402 micropayments and executes onchain actions through KeeperHub MCP. Two real onchain transactions per run — not a demo, not a mockup.

## The Problem

AI agents can discover and reason about API data, but they hit a wall when they need to **pay** for it and **act** on it onchain. x402 solves the payment side. KeeperHub solves the execution side. Nothing connects them — until now.

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROOK COMMERCE AGENT                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. DISCOVER                                                     │
│     Agent reads llms.txt → finds 80 x402 paid endpoints         │
│         ↓                                                        │
│  2. PAY                                                          │
│     Agent calls /api/ai-analysis → receives 402 challenge       │
│     CDP wallet signs EIP-3009 authorization → $0.001 USDC     │
│     Payment settles on Base → 200 OK + intelligence returned   │
│         ↓                                                        │
│  3. ANALYZE                                                      │
│     Agent parses response → detects "bullish" signal            │
│     Decides action: execute onchain transfer via KeeperHub      │
│         ↓                                                        │
│  4. EXECUTE                                                      │
│     Agent connects to KeeperHub MCP (initialize → handshake)   │
│     Calls execute_transfer → KeeperHub signs + broadcasts      │
│     Tx hash confirmed on Base → full audit trail printed       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Why This Matters

Every run produces **two real onchain transactions**:

1. **x402 payment** — real USDC settled on Base via EIP-3009
2. **KeeperHub execution** — real onchain transfer via KeeperHub MCP

This is the agent commerce stack: agents that pay for their own intelligence and act on it onchain, autonomously.

## KeeperHub Integration

This agent uses KeeperHub as its onchain execution layer via the MCP server.

**Connection**: HTTP JSON-RPC to `https://app.keeperhub.com/mcp`
**Auth**: Bearer token (organization API key, `kh_` prefix)
**Handshake**: `initialize` → capture `mcp-session-id` from response headers → `notifications/initialized` → tool calls

**MCP tools used:**

| Tool | Purpose |
|---|---|
| `list_integrations` | Discover the execution wallet address |
| `execute_transfer` | Transfer USDC on Base (simulate first, then execute) |

**Key parameters for `execute_transfer`:**
- `chain_id`: `"8453"` (Base mainnet — string, not number)
- `to_address`: recipient EVM address
- `amount`: human-readable string (e.g. `"0.001"`)
- `token_address`: ERC20 contract (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` for USDC on Base)
- `simulate`: `true` for dry-run, omit for real execution

**Confirmed transactions:**
- x402 payment: https://basescan.org/tx/0x8251416505d31887d592ec465eb87cbb06e95fcce9eebfd6a59ffe29a28394a1
- KeeperHub execution: https://basescan.org/tx/0x3b35e558085c951113762418de788748dc84a5597531d17feee17293e70b4ed8

## Tech Stack

- **Node.js 22** — runtime
- **@coinbase/cdp-sdk** — wallet management + EIP-3009 payment signing
- **@x402/fetch** — x402 payment-aware HTTP client
- **KeeperHub MCP** — onchain execution via Model Context Protocol
- **dotenv** — environment management
- **ethers** — utility (address validation, encoding)

## Prerequisites

- Node.js 22+
- CDP (Coinbase Developer Platform) account with API keys
- KeeperHub account with API key and funded wallet
- USDC on Base (for both the x402 payment wallet and KeeperHub exec wallet)

## Setup

```bash
# Install dependencies
npm install @coinbase/cdp-sdk @x402/fetch dotenv ethers

# Configure environment
cp .env.example .env
# Fill in:
# - CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET
# - KEEPERHUB_API_KEY, KEEPERHUB_MCP_URL
# - SERVER_URL (your x402 endpoint host)
```

## Usage

```bash
# Full flow with default endpoint (/api/ai-analysis)
node rook-commerce-agent.js

# Paced output for demo recording
node rook-commerce-agent.js --demo

# Specific endpoint
node rook-commerce-agent.js --endpoint /api/translate
```

## Sample Output

```
╔════════════════════════════════════════════╗
║  Rook Commerce Agent                       ║
║  x402 payment → KeeperHub onchain execution ║
╚════════════════════════════════════════════╝

[1] Discovering x402 endpoints from llms.txt...
    Found 80 endpoints: /api/hello, /api/preview/market-pulse, ...
[2] Calling paid endpoint: /api/ai-analysis
    ← 402 Payment Required
    → Paying $0.001 USDC on Base
    → Signing payment via CDP wallet...
    ← HTTP 200
    ✅ Payment settled on Base
    Tx: https://basescan.org/tx/0xe57f58ba...
[3] Analyzing intelligence...
    Signal: bullish (confidence: 75%)
    → Action: execute_transfer
[4] Connecting to KeeperHub MCP...
    → Calling execute_transfer...
    ✅ Onchain execution completed
    Tx: https://basescan.org/tx/0x50e379e7...
[5] Full Audit Trail
    ═══════════════════════════════════════
    x402 Payment:
      Endpoint:  /api/ai-analysis
      Network:   Base (eip155:8453)
      Tx:        https://basescan.org/tx/0xe57f58ba...
    Onchain Action:
      Protocol:  KeeperHub MCP
      Signal:    BULLISH
      Tx:        https://basescan.org/tx/0x50e379e7...
    ═══════════════════════════════════════

✅ Rook Commerce Agent — flow complete.
```

## Onboarding Deliverables

This repo also includes deliverables for the **Best Onboarding UX Improvement** bounty:

- **[STARTER_TEMPLATE.md](./STARTER_TEMPLATE.md)** — Zero to first transaction in 15 minutes, beginner-friendly
- **[TUTORIAL.md](./TUTORIAL.md)** — Full step-by-step walkthrough with troubleshooting
- **[ONBOARDING_TEARDOWN.md](./ONBOARDING_TEARDOWN.md)** — Every friction point hit during the build, with proposed fixes

## License

MIT
