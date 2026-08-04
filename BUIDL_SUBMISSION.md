# BUIDL Submission Text — Rook Commerce Agent

> Paste this into the DoraHacks BUIDL submission form. Keep it concise — judges review dozens of submissions.

---

## Project Name

Rook Commerce Agent

## One-Line Description

Autonomous AI agent that pays for API intelligence via x402 micropayments and executes onchain actions through KeeperHub MCP — two real onchain transactions per run.

## What is the problem?

AI agents can discover and reason about API data, but they hit a wall when they need to **pay** for it and **act** on it onchain. x402 solves the payment side (HTTP 402 → onchain USDC micropayment → data returned). KeeperHub solves the execution side (MCP → managed wallet → signed broadcast). Nothing connects them — agents that pay for their own intelligence and act on it autonomously don't exist yet.

## Why does it matter?

The agent commerce stack — agents that pay for their own API calls and execute onchain based on what they learn — is the missing piece between "AI agent that reasons" and "AI agent that transacts." x402 enables pay-per-call without subscriptions. KeeperHub enables onchain execution without managing private keys or gas. Together: an agent that reads paid market intelligence, decides to act, and executes a real onchain transaction — all autonomously, with a full audit trail.

## Who is it for?

- Agent builders who want their agents to pay for API data and act onchain without managing payment infrastructure or wallet keys
- x402 endpoint operators who want real agents consuming their paid APIs
- Anyone prototyping the agent commerce stack (x402 payment + onchain execution)

## How it works

```
1. DISCOVER: Agent reads llms.txt → finds 80 x402 paid endpoints
2. PAY: Agent calls /api/ai-analysis → receives 402 challenge → CDP wallet signs EIP-3009 → $0.001 USDC on Base → 200 OK + intelligence returned
3. ANALYZE: Agent parses response → detects "bullish" signal → decides action: onchain transfer
4. EXECUTE: Agent connects to KeeperHub MCP (initialize → handshake) → calls execute_transfer → KeeperHub signs + broadcasts → tx hash confirmed on Base
```

Two real onchain transactions per run:
- **x402 payment tx**: https://basescan.org/tx/0x8251416505d31887d592ec465eb87cbb06e95fcce9eebfd6a59ffe29a28394a1
- **KeeperHub execution tx**: https://basescan.org/tx/0x3b35e558085c951113762418de788748dc84a5597531d17feee17293e70b4ed8

## KeeperHub Integration

This agent uses KeeperHub as its onchain execution layer via the MCP server.

- **Connection**: HTTP JSON-RPC to `https://app.keeperhub.com/mcp`
- **Auth**: Bearer token (organization API key, `kh_` prefix)
- **Handshake**: `initialize` → capture `mcp-session-id` from response headers → `notifications/initialized` → tool calls
- **Tools used**: `list_integrations` (find execution wallet), `execute_transfer` (onchain USDC transfer on Base)
- **Simulate-first pattern**: Every `execute_transfer` call is simulated with `simulate: true` before real execution
- **Audit trail**: Full output includes both tx hashes, endpoint called, signal detected, and action taken


## Reliability & Failure Handling

The agent is built to handle the real failure modes of onchain commerce:

- **Simulate-before-execute**: Every  call runs with  first. If simulation fails, the agent reports the error and halts — no real funds move on a bad call.
- **402 challenge inspection**: Before signing payment, the agent decodes the base64  header to verify the amount, recipient, and network. No blind signing.
- **MCP session retry**: If the  handshake fails or the session ID is missing from response headers, the agent retries the connection before proceeding. MCP sessions are stateful — a dropped session means lost tool calls.
- **Gas estimation via simulate**: The simulate step catches insufficient gas, wrong chain, and invalid token contract addresses before any real broadcast.
- **Full audit trail**: Every run prints both tx hashes, the endpoint called, the signal detected, and the action taken. If something goes wrong, the trail shows exactly where.
- **Wallet identity verification**: The agent calls  to discover the actual MCP execution wallet — NOT the CLI wallet from . Funding the wrong wallet is the #1 onboarding failure.

## What makes it different

1. **x402 + KeeperHub in one agent** — no other submission combines x402 payment with KeeperHub execution. This is the full agent commerce stack.
2. **Real transactions, not mockups** — two confirmed onchain txs per run on Base, verifiable on Basescan.
3. **Onboarding deliverables included** — starter template, tutorial, and teardown doc with proposed fixes to KeeperHub docs (PR #1902 submitted).
4. **Full audit trail** — every run prints the x402 payment tx hash, the KeeperHub execution tx hash, the signal detected, and the action taken.

## Tech Stack

- **Node.js 22** — runtime
- **@coinbase/cdp-sdk** — wallet management + EIP-3009 payment signing
- **@x402/fetch** — x402 payment-aware HTTP client
- **KeeperHub MCP** — onchain execution via Model Context Protocol (35 tools)
- **dotenv** — environment management

## Milestones

**Milestone 1 (Q3 2026): Multi-endpoint orchestration**
Agent queries multiple x402 endpoints in sequence, aggregates intelligence across data sources, and executes a portfolio of onchain actions based on combined signals. From single-call to multi-strategy.

**Milestone 2 (Q4 2026): Self-funded agent loop**
Agent earns USDC from onchain actions (yield, arbitrage, solver fees) and uses it to pay for its own x402 API calls. Fully autonomous economic loop with no external funding needed — the agent pays for itself.

## Links

- **GitHub**: https://github.com/Ai-Rook/rook-commerce-agent
- **Demo video**: https://youtu.be/67ZvZj26pPk
- **x402 payment tx**: https://basescan.org/tx/0x8251416505d31887d592ec465eb87cbb06e95fcce9eebfd6a59ffe29a28394a1
- **KeeperHub execution tx**: https://basescan.org/tx/0x3b35e558085c951113762418de788748dc84a5597531d17feee17293e70b4ed8
- **KeeperHub docs PR**: https://github.com/KeeperHub/keeperhub/pull/1902

## Onboarding Bounty Deliverables

This submission also includes deliverables for the **Best Onboarding UX Improvement** bounty:

1. **Merged PR** — PR #1902 to KeeperHub/keeperhub: adds headless MCP quickstart guide + wallet identity warning
2. **Starter template** — `STARTER_TEMPLATE.md`: zero to first transaction in 15 minutes
3. **Tutorial** — `TUTORIAL.md`: full step-by-step walkthrough with troubleshooting
4. **Teardown** — `ONBOARDING_TEARDOWN.md`: 5 friction points with proposed fixes, honestly split between real KeeperHub friction and my own coding mistakes
