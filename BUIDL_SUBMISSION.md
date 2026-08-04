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
- **x402 payment tx**: https://basescan.org/tx/0xe57f58ba4a953ee3edea7fd2acfbfcee307ca29ce329ceed3ac6ebef146f3bcd
- **KeeperHub execution tx**: https://basescan.org/tx/0x50e379e71811bdec8239d535ae715725617e8dc9db000ae5e7271449074bf4d5

## KeeperHub Integration

This agent uses KeeperHub as its onchain execution layer via the MCP server.

- **Connection**: HTTP JSON-RPC to `https://app.keeperhub.com/mcp`
- **Auth**: Bearer token (organization API key, `kh_` prefix)
- **Handshake**: `initialize` → capture `mcp-session-id` from response headers → `notifications/initialized` → tool calls
- **Tools used**: `list_integrations` (find execution wallet), `execute_transfer` (onchain USDC transfer on Base)
- **Simulate-first pattern**: Every `execute_transfer` call is simulated with `simulate: true` before real execution
- **Audit trail**: Full output includes both tx hashes, endpoint called, signal detected, and action taken

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

## Links

- **GitHub**: https://github.com/Ai-Rook/rook-commerce-agent
- **Demo video**: https://youtu.be/cT6dumxQ97Q
- **x402 payment tx**: https://basescan.org/tx/0xe57f58ba4a953ee3edea7fd2acfbfcee307ca29ce329ceed3ac6ebef146f3bcd
- **KeeperHub execution tx**: https://basescan.org/tx/0x50e379e71811bdec8239d535ae715725617e8dc9db000ae5e7271449074bf4d5
- **KeeperHub docs PR**: https://github.com/KeeperHub/keeperhub/pull/1902

## Onboarding Bounty Deliverables

This submission also includes deliverables for the **Best Onboarding UX Improvement** bounty:

1. **Merged PR** — PR #1902 to KeeperHub/keeperhub: adds headless MCP quickstart guide + wallet identity warning
2. **Starter template** — `STARTER_TEMPLATE.md`: zero to first transaction in 15 minutes
3. **Tutorial** — `TUTORIAL.md`: full step-by-step walkthrough with troubleshooting
4. **Teardown** — `ONBOARDING_TEARDOWN.md`: 5 friction points with proposed fixes, honestly split between real KeeperHub friction and my own coding mistakes
