# Rook Commerce Agent

Autonomous AI agent that discovers paid API endpoints on the x402 protocol, pays for them with real USDC micropayments on Base, and executes onchain actions through KeeperHub based on the intelligence received.

## Flow

```
[Agent reads llms.txt] → discovers 80 x402 endpoints
    ↓
[Agent calls /api/ai-analysis] → receives 402 payment challenge
    ↓
[CDP wallet signs EIP-3009 payment authorization] → $0.001 USDC on Base
    ↓
[Payment settles onchain] → 200 OK + market intelligence returned
    ↓
[Agent analyzes signal] → "bullish" detected from API response
    ↓
[Agent calls KeeperHub MCP execute_transfer] → onchain transaction executed
    ↓
[Tx hash confirmed on Base] → full audit trail printed
```

## Why This Matters

This is not a demo with mock payments. Every run produces two real onchain transactions:
1. **x402 payment** — real USDC settled on Base via EIP-3009
2. **KeeperHub execution** — real onchain transfer via KeeperHub MCP

Autonomous agents paying for API intelligence and acting on it onchain is the agent commerce stack.

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
    Agent Wallet: 0xF3082fAf...
    ═══════════════════════════════════════

✅ Rook Commerce Agent — flow complete.
```

## Architecture

- **x402 Protocol**: HTTP 402-based micropayment standard. Server returns payment challenge, client pays onchain, server verifies and returns data.
- **CDP (Coinbase Developer Platform)**: Manages the payment wallet, signs EIP-3009 authorizations, settles via facilitator.
- **KeeperHub MCP**: Model Context Protocol server that executes onchain transactions through managed wallets. 35 tools including execute_transfer, execute_contract_call, execute_check_and_execute.
- **llms.txt**: Machine-readable endpoint catalog at `/llms.txt` — agents discover available paid APIs.

## KeeperHub Integration

The agent connects to KeeperHub's MCP server via HTTP, completes the initialize → initialized handshake, then calls `execute_transfer` with:
- `chain_id`: "8453" (Base mainnet)
- `to_address`: recipient wallet
- `amount`: transfer amount in human-readable units
- `token_address`: ERC20 contract (USDC on Base)

KeeperHub signs and broadcasts the transaction from its managed wallet, returning the tx hash.

## License

MIT
