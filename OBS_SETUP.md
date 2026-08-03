# OBS Setup Instructions — Rook Commerce Agent Demo Video

> **Goal:** Record a 2-3 minute demo showing the agent running in terminal + tx on Basescan
> **Setup:** Two OBS scenes — Terminal and Browser

---

## Pre-Recording Checklist

1. **On Queen** (BDubs' monitor is attached here):
   - Open Terminal app
   - SSH to VPS: `ssh -i /root/.openclaw/workspace/id_rook_container root@149.28.37.72`
   - Navigate to: `cd /opt/rook-commerce-agent`
   - Test run: `node demo-video.js` (confirm it works before recording)
   - Clear the terminal: `clear`

2. **Open Chrome** and navigate to:
   - https://basescan.org/tx/0xe57f58ba4a953ee3edea7fd2acfbfcee307ca29ce329ceed3ac6ebef146f3bcd (x402 payment tx)
   - Have this tab ready but don't show it yet

3. **OBS Setup:**
   - Open OBS on Queen
   - Set recording output to 1080p, 30fps
   - Audio: disable microphone (voiceover added later), disable system audio

---

## OBS Scene 1: Terminal

- **Source:** Window Capture → Terminal.app
- **Filter:** None needed — terminal text is sharp
- **Layout:** Full screen terminal, black background

## OBS Scene 2: Browser (Basescan)

- **Source:** Window Capture → Google Chrome
- **Layout:** Full screen browser

---

## Recording Flow

### Take 1: Terminal Run (~2 min)

1. Switch to **Scene 1: Terminal**
2. Hit **Start Recording** in OBS
3. In terminal, type: `node demo-video.js`
4. Press Enter
5. Let it run — the script has 8-10 second pauses between each step
6. Wait for the full audit trail to print (script ends with "github.com/Ai-Rook/rook-commerce-agent")
7. Wait 3 seconds after completion
8. Hit **Stop Recording** in OBS

### Take 2: Basescan Verification (~30 sec)

1. Switch to **Scene 2: Browser**
2. Hit **Start Recording**
3. Show the x402 payment tx page (already loaded)
4. Scroll down to show the transaction details (from, to, value, status)
5. Wait 5 seconds
6. Switch to the KeeperHub execution tx:
   - https://basescan.org/tx/0x50e379e71811bdec8239d535ae715725617e8dc9db000ae5e7271449074bf4d5
7. Scroll to show transaction details
8. Wait 5 seconds
9. Hit **Stop Recording**

---

## Post-Recording

1. **Terminal recording** = main video (2 min)
2. **Basescan recording** = verification clip (30 sec)
3. **Voiceover** = generated via ElevenLabs Adam (script in VOICEOVER_SCRIPT.md)
4. **Final edit:**
   - Terminal run (2 min) → cut to Basescan verification (30 sec)
   - Overlay voiceover audio on top
   - No music needed — keep it clean
   - Add title card at start: "Rook Commerce Agent — KeeperHub Agents Onchain Hackathon"
   - Add end card: "github.com/Ai-Rook/rook-commerce-agent"
   - Export as 1080p MP4

---

## Quick Reference — What You'll See in Terminal

```
══════════════════════════════════════════════════
  ROOK COMMERCE AGENT
══════════════════════════════════════════════════

  x402 micropayment → API intelligence → KeeperHub onchain execution
  Two real onchain transactions per run. Not a demo. Not a mockup.

  [8 second pause]

══════════════════════════════════════════════════
  STEP 1: DISCOVER x402 ENDPOINTS
══════════════════════════════════════════════════

  Found 80 paid endpoints:
    1. /api/hello
    2. /api/ai-analysis
    ...

  [8 second pause]

══════════════════════════════════════════════════
  STEP 2: PAY FOR API INTELLIGENCE
══════════════════════════════════════════════════

  ← 402 Payment Required
  → Amount: $0.001 USDC on Base
  → CDP wallet signing EIP-3009...
  ✅ x402 PAYMENT CONFIRMED ON BASE
  🔗 https://basescan.org/tx/0x...

  [8 second pause]

══════════════════════════════════════════════════
  STEP 3: ANALYZE INTELLIGENCE
══════════════════════════════════════════════════

  Signal: BULLISH
  Confidence: 75%

  [8 second pause]

══════════════════════════════════════════════════
  STEP 4: EXECUTE ONCHAIN VIA KEEPERHUB MCP
══════════════════════════════════════════════════

  ✅ KEEPERHUB ONCHAIN EXECUTION CONFIRMED
  🔗 https://basescan.org/tx/0x...

  [8 second pause]

══════════════════════════════════════════════════
  STEP 5: FULL AUDIT TRAIL
══════════════════════════════════════════════════

  ✅ Rook Commerce Agent — flow complete.
  github.com/Ai-Rook/rook-commerce-agent
```

---

## Troubleshooting

- **Agent fails with "insufficient balance"**: KeeperHub MCP exec wallet needs USDC. Current balance: 0.01 USDC. One run costs 0.001 USDC. Should have ~10 runs left.
- **CDP payment fails**: CDP EOA wallet 2 (`0x58036...`) needs USDC on Base for x402 payment. Check balance: `curl -s https://base.blockscout.com/api/v2/addresses/0x58036314b04952B37bf77758ABD6D806Cfb24ECC/token-balances`
- **Script not found**: Make sure you're in `/opt/rook-commerce-agent` on the VPS
- **Dependencies missing**: Run `npm install` in `/opt/rook-commerce-agent` first
