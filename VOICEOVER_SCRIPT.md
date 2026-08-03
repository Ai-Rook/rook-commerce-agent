# Video Voiceover Script — Rook Commerce Agent Demo

> **Length:** ~2:30
> **Voice:** ElevenLabs Adam
> **Pacing:** Match to terminal output pauses (8-10s between steps)
> **Tone:** Direct, technical, no hype

---

## Script

**[0:00 — Title card: "Rook Commerce Agent"]**

This is the Rook Commerce Agent. An autonomous AI agent that pays for API intelligence with real USDC on Base, then executes an onchain transaction through KeeperHub. Two real onchain transactions per run. Not a demo, not a mockup.

**[0:15 — Step 1: Discover]**

The agent starts by reading llms.txt from the x402 endpoint server. This is a machine-readable catalog of paid API endpoints. It finds eighty endpoints and selects the AI analysis endpoint for market intelligence.

**[0:35 — Step 2: Pay]**

The agent calls the endpoint. The server responds with HTTP 402 — Payment Required. The challenge includes the amount, the payment address, and the supported networks. The agent's CDP wallet signs an EIP-3009 payment authorization for one-tenth of a cent in USDC on Base. The payment settles onchain and the server returns the market intelligence.

**[1:05 — Step 3: Analyze]**

The agent parses the API response and detects a bullish signal with seventy-five percent confidence. Based on this signal, it decides to execute an onchain transfer through KeeperHub.

**[1:20 — Step 4: Execute]**

The agent connects to KeeperHub's MCP server. It completes the initialize handshake, captures the session ID from the response headers, and calls execute transfer. KeeperHub signs and broadcasts the transaction from its managed wallet. The transaction confirms on Base.

**[1:45 — Step 5: Audit Trail]**

The full audit trail shows both onchain transactions — the x402 payment and the KeeperHub execution. Both are verifiable on Basescan. This is the agent commerce stack: agents that pay for their own intelligence and act on it onchain.

**[2:10 — End card: github.com/Ai-Rook/rook-commerce-agent]**

Rook Commerce Agent. Built for the KeeperHub Agents Onchain Hackathon. github.com/Ai-Rook/rook-commerce-agent.

---

## Voiceover Production Notes

- Use ElevenLabs Adam voice (ID: s3TPKV1kjDlVtZbl4Ksh)
- Generate as one continuous file, then cut to match terminal pacing
- No music bed — keep it clean and technical
- If terminal runs faster/slower than script, adjust pause lengths in demo-video.js
- Alternative: generate each section as separate audio clips for easier alignment

## Audio Generation Commands

```bash
# Generate full voiceover via ElevenLabs API
# (Run from VPS or local machine with ElevenLabs API key)

curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/s3TPKV1kjDlVtZbl4Ksh" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "PLACE_FULL_SCRIPT_HERE",
    "model_id": "eleven_turbo_v2_5",
    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "style": 0.0}
  }' \
  --output demo-voiceover.mp3
```
