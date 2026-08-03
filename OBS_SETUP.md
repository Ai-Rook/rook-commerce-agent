# OBS Setup Instructions — Dual Screen Demo Video

> **Goal:** Single-take 2-3 min demo, terminal + Basescan side by side
> **Setup:** One OBS scene, two window captures, side by side

---

## Pre-Recording Checklist (on Queen)

1. **Terminal** (left side of screen):
   - Open Terminal.app
   - SSH to VPS: `ssh -i /root/.openclaw/workspace/id_rook_container root@149.28.37.72`
   - Navigate: `cd /opt/rook-commerce-agent`
   - Test run: `node demo-video.js` (confirm it works, then `clear`)
   - Size window to left half of screen

2. **Chrome** (right side of screen):
   - Tab 1: https://basescan.org/tx/0xe57f58ba4a953ee3edea7fd2acfbfcee307ca29ce329ceed3ac6ebef146f3bcd
   - Tab 2: https://basescan.org/tx/0x50e379e71811bdec8239d535ae715725617e8dc9db000ae5e7271449074bf4d5
   - Size window to right half of screen
   - Leave on Tab 1 (x402 payment tx)

3. **OBS:**
   - 1080p, 30fps
   - Audio: disable mic (voiceover added later), disable system audio
   - Create one scene: "Dual Screen"

## OBS Scene: Dual Screen

- **Source 1:** Window Capture → Terminal.app (positioned left half, 960px wide)
- **Source 2:** Window Capture → Google Chrome (positioned right half, 960px wide)
- Both sources in the same scene, side by side

---

## Recording Flow (Single Take)

1. **Start Recording** in OBS
2. In terminal, type: `node demo-video.js` and press Enter
3. Watch the terminal — the script has 8-9 second pauses between each step:
   - **Step 1 (Discover):** Agent reads llms.txt, finds 80 endpoints
   - **Step 2 (Pay):** 402 challenge → CDP wallet signs → ✅ payment confirmed → tx hash printed
   - → When tx hash appears on left, switch Chrome to Tab 1 on right (x402 payment tx) — show it confirmed
   - **Step 3 (Analyze):** Signal detected, agent decides to act
   - **Step 4 (Execute):** KeeperHub MCP → execute_transfer → ✅ onchain execution confirmed → tx hash printed
   - → When tx hash appears on left, switch Chrome to Tab 2 on right (KeeperHub execution tx) — show it confirmed
   - **Step 5 (Audit Trail):** Full summary with both tx links
4. Wait 3 seconds after "github.com/Ai-Rook/rook-commerce-agent"
5. **Stop Recording**

Total: ~2:30

---

## Post-Recording (Rook handles)

1. Generate voiceover via ElevenLabs Adam from `VOICEOVER_SCRIPT.md`
2. Overlay voiceover audio on the dual-screen recording
3. Add title card at start: "Rook Commerce Agent — KeeperHub Agents Onchain Hackathon"
4. Add end card: "github.com/Ai-Rook/rook-commerce-agent"
5. Export 1080p MP4
6. Upload to YouTube (unlisted) or host directly for DoraHacks submission link

---

## Troubleshooting

- **Agent fails "insufficient balance"**: KeeperHub MCP exec wallet (0xE5A347...) has ~0.01 USDC. One run = 0.001 USDC. ~10 runs left.
- **CDP payment fails**: CDP EOA wallet 2 (0x58036...) needs USDC on Base. Check: `curl -s https://base.blockscout.com/api/v2/addresses/0x58036314b04952B37bf77758ABD6D806Cfb24ECC/token-balances`
- **Script not found**: Be in `/opt/rook-commerce-agent` on the VPS
- **Dependencies missing**: `npm install` in `/opt/rook-commerce-agent`
- **Window capture blank**: Make sure Terminal and Chrome are actually visible on screen (not minimized)
