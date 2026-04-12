# 😤 Petty Ledger — *Backend Technical Spec v2*

**Hackathon deadline: Sunday April 12, 2026 · 1:00 PM** ⏰

---

## The pitch (read this first)

> *The XRPL doesn’t pick sides in your drama — it just timestamps it for the rest of human civilization.* 🌍✨

**Emayan** is the codename. **Petty Ledger** is the vibe: turn beef into **bytes**, shade into **signatures**, and optional **XRP** into “donations” to causes the other person would *loathe*. You get receipts; they get notified; the ledger stays petty forever. 📜🔥

| | |
|:---|:---|
| 📝 | **File** a grievance — text on-chain, no “I never said that” |
| 💸 | **Stake** XRP in **`petty_ledger`** (XRPL smart vault) — hold, release, or forfeit with clear rules |
| 🎯 | **Name** a subject — their wallet is the one that can authorize certain payouts |
| 🎭 | **Pick** a cause — symbolic justice, maximum spite, minimum ambiguity |
| 📱 | **Flex** cards & Telegram off-chain — the chain handles truth; we handle drama |

**TL;DR:** Wallet in, grievance recorded, money moves only where the contract says. No “trust me bro” — **trust the hash.** ✅🤝

*Tone check:* we’re half serious about verifiable records, half unserious about how fun petty can be. If you smile at the table, the README did its job. 😌

---

## Introduction & repository layout

**Emayan** is our hackathon project: a **grievance ledger on the XRP Ledger** — public, verifiable complaints, optionally paired with symbolic XRP “donations” to causes the other party would dislike, plus human-readable **cards** and **Telegram** around those on-chain facts.

In **this repository**, **Petty Ledger** is not just a brand: it is the **`petty_ledger`** smart contract in [`contracts/petty-ledger/`](contracts/petty-ledger/) (`src/lib.rs`; Rust → WASM for XRPL Bedrock; deployed as the ledger’s **vault** primitive). That contract is the on-chain authority for **recording** grievance envelopes in memos, **holding** XRP when custody matters, and **authorizing withdrawals** to filer, subject, or donation addresses. The UI and bots orchestrate wallets and messaging; **`petty_ledger`** defines the rules for stake tied to a grievance. See [`contracts/petty-ledger/README.md`](contracts/petty-ledger/README.md) for memo formats and build/deploy notes.

### Project structure

| Path | Role |
|------|------|
| [`ui/my-app/`](ui/my-app/) | Next.js frontend: grievance filing UX, XRPL wallet connection, direct WebSocket usage via `xrpl.js` / client tooling, components (`GrievanceForm`, `SentTransactionsPanel`, `Header`, etc.), optional API routes under `app/api/`. |
| [`contracts/petty-ledger/`](contracts/petty-ledger/) | Bedrock project: **`petty_ledger`** (`src/lib.rs`), `bedrock.toml`, networks (e.g. testnet). Same smart vault primitive as XRPL/Bedrock “vault.” |

---

## What we are building

A grievance ledger on the XRP Ledger. Users file complaints against a person or situation, optionally attach a micro-donation to a cause the guilty party would hate, and the accused is notified via Telegram. Every public grievance is recorded permanently on chain. No REST API — the frontend connects directly to XRPL via WebSocket using xrpl.js.

---

## The Four Filing Types

### Type 1 — No Recipient
Anonymous grievance. No name. No accused. Goes to the public ledger only. Optional cause donation fires immediately if selected.

### Type 2 — Recipient, No Donation
Named accused. On the permanent record. No financial consequence. Just the record.

### Type 3 — Recipient, Immediate Donation
Named accused. Cause selected. Donation fires immediately. No warning. No deadline. Already done.

### Type 4 — Recipient, Deadline
Named accused. Cause selected. Deadline set. Donation held in XRPL native escrow until deadline. Filer receives Telegram magic link to cancel before deadline. If no cancellation, escrow auto-executes at deadline.

---

## Cards by Type

| Type | Cards generated |
|---|---|
| 1 — No recipient | Card 1 |
| 2 — Recipient, no donation | Card 2 |
| 3 — Recipient, immediate | Card 3 |
| 4 — Recipient, deadline | Card 4a → Card 4b or 4c |

### Card 1 — No Recipient
Appears on confirmation page. Feeds public ledger. No Telegram sent.
> "Let the record show that on this day, a grievance has been entered into the permanent public record. The details are immutable and may be viewed by anyone with an internet connection, for the remainder of human civilization."
> *For the record, Petty Ledger*

### Card 2 — Recipient, No Donation
Appears on confirmation page. Sent to accused via Telegram if handle provided.
> "Dear [accused], on this day your actions have been entered into the permanent public record. The details are immutable. There is no financial consequence at this time. The record simply stands."
> *Yours in documentation, Petty Ledger*

### Card 3 — Recipient, Immediate Donation
Appears on confirmation page. Sent to accused via Telegram.
> "Dear [accused], we write to inform you that a donation of €[amount] has been made to [cause] on your behalf. This was not a warning. There was no deadline. The matter has been settled. The chain witnessed this."
> *Justice, however small, Petty Ledger*

### Card 4a — Recipient, Deadline (the warning)
Sent to accused via Telegram immediately on submission.
> "Dear [accused], on this day [filer/anonymous] has entered into the permanent public record that [grievance]. A donation of €[amount] to [cause] will be made on your behalf unless this matter is corrected by [deadline]. The chain is watching."
> *Justice, however small, Petty Ledger*

### Card 4b — Resolution (filer tapped magic link before deadline)
Sent to accused via Telegram when filer cancels.
> "Dear [accused], we are pleased to inform you that the matter has been resolved. The donation to [cause] has been cancelled. The chain witnessed your correction. This grievance remains on the permanent record. The charge against you has been released."
> *Grudgingly yours, Petty Ledger*

### Card 4c — Failure (deadline passed, escrow auto-executed)
Sent to accused via Telegram when escrow executes.
> "Dear [accused], the deadline has passed. A donation of €[amount] has been made to [cause] on your behalf. This grievance remains on the permanent public record. There is nothing further to be done."
> *The chain does not care about your reasons, Petty Ledger*

---

## Flow Maps

### Type 1 — No Recipient

```
Filer submits → no name entered
      ↓
XRPL payment fires (memo: grievance text, anonymous flag)
Optional: if cause selected → payment to cause wallet immediately
      ↓
Confirmation page → Card 1 displayed
Filer screenshots/shares
Grievance feeds public ledger
      ↓
DONE. No Telegram sent. No follow-up.
```

### Type 2 — Recipient, No Donation

```
Filer submits → names accused, no cause, no deadline
      ↓
XRPL payment fires (memo: grievance + accused name)
      ↓
Confirmation page → Card 2 displayed
If accused Telegram handle provided → Card 2 sent to accused
Filer screenshots/shares
      ↓
DONE. No escrow. No follow-up.
```

### Type 3 — Recipient, Immediate Donation

```
Filer submits → names accused, selects cause,
                chooses "donate immediately"
      ↓
XRPL payment fires immediately to cause wallet
(memo: grievance + accused name + cause + "immediate")
      ↓
Confirmation page → Card 3 displayed
Card 3 sent to accused via Telegram
Filer screenshots/shares
      ↓
DONE. No escrow. No follow-up.
```

### Type 4 — Recipient, Deadline

```
Filer submits → names accused, selects cause,
                sets deadline, provides OWN Telegram handle
      ↓
XRPL EscrowCreate fires (time-locked to deadline)
(memo: grievance + accused + cause + deadline)
      ↓
Confirmation page → Card 4a displayed
Card 4a sent to accused via Telegram (the warning)
Filer receives magic link via their Telegram:
  "Your grievance against [accused] expires at [deadline].
   Tap here if they correct the matter before then."
      ↓
      ├── BEFORE DEADLINE: Filer taps magic link
      │         ↓
      │   EscrowCancel fires on XRPL
      │   Card 4b sent to accused (Resolution)
      │   Ledger updated: resolved
      │   DONE
      │
      └── DEADLINE PASSES: Cron job auto-executes
                ↓
          EscrowFinish fires on XRPL
          Donation releases to cause wallet
          Card 4c sent to accused (Failure)
          Public post fires to @thepettyledger Telegram channel
          Ledger updated: failed
          DONE
```

---

## XRPL Architecture

### Direct WebSocket — No REST API
The frontend connects directly to XRPL via WebSocket using xrpl.js in the browser. No backend API proxy. The wallet signs and submits transactions client-side. This is cleaner, more technically impressive, and verifiably on-chain.

```javascript
import * as xrpl from 'xrpl'

const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233') // testnet
await client.connect()
```

### Transaction — Types 1, 2, 3 (standard payment)

```javascript
const grievanceData = {
  type: 'grievance', // 'grievance' | 'immediate_donation'
  accused: accusedName || null,
  cause: causeId || null,
  grievance: grievanceText,
  anonymous: isAnonymous,
  timestamp: Date.now()
}

const tx = {
  TransactionType: 'Payment',
  Account: userWallet.address,
  Amount: causeId ? xrpl.xrpToDrops(donationAmount) : xrpl.xrpToDrops('0.001'), // minimum if no donation
  Destination: causeId ? CAUSE_WALLETS[causeId] : PETTY_LEDGER_WALLET,
  Memos: [
    {
      Memo: {
        MemoType: Buffer.from('petty-ledger', 'utf8').toString('hex').toUpperCase(),
        MemoData: Buffer.from(JSON.stringify(grievanceData), 'utf8').toString('hex').toUpperCase(),
        MemoFormat: Buffer.from('application/json', 'utf8').toString('hex').toUpperCase()
      }
    }
  ]
}

const prepared = await client.autofill(tx)
const signed = userWallet.sign(prepared)
const result = await client.submitAndWait(signed.tx_blob)
```

### Transaction — Type 4 (escrow)

```javascript
// Create escrow on submission
const escrowCreate = {
  TransactionType: 'EscrowCreate',
  Account: userWallet.address,
  Amount: xrpl.xrpToDrops(donationAmount),
  Destination: CAUSE_WALLETS[causeId],
  FinishAfter: xrpl.isoTimeToRippleTime(deadlineISO),
  Memos: [
    {
      Memo: {
        MemoType: Buffer.from('petty-ledger-escrow', 'utf8').toString('hex').toUpperCase(),
        MemoData: Buffer.from(JSON.stringify({
          type: 'deadline_grievance',
          accused: accusedName,
          cause: causeId,
          grievance: grievanceText,
          deadline: deadlineISO,
          filerTelegram: filerTelegramHandle
        }), 'utf8').toString('hex').toUpperCase()
      }
    }
  ]
}

// Cancel escrow (filer taps magic link — matter resolved)
const escrowCancel = {
  TransactionType: 'EscrowCancel',
  Account: userWallet.address,
  Owner: userWallet.address,
  OfferSequence: escrowSequence
}

// Finish escrow (deadline passed — auto-executed by cron)
const escrowFinish = {
  TransactionType: 'EscrowFinish',
  Account: userWallet.address, // backend wallet signs this
  Owner: originalFilerAddress,
  OfferSequence: escrowSequence
}
```

**Important:** EscrowFinish can only fire after FinishAfter timestamp. Cron job runs every minute checking for expired escrows.

```javascript
// Cron: auto-execute expired Type 4 grievances
setInterval(async () => {
  const expired = await db.query(
    `SELECT * FROM grievances 
     WHERE type = 'deadline' 
     AND deadline < NOW() 
     AND status = 'pending'`
  )
  for (const g of expired.rows) {
    await finishEscrow(g)           // releases to cause wallet
    await sendCard4c(g)             // sends failure card to accused
    await postToPublicChannel(g)    // fires to @thepettyledger
    await updateStatus(g.id, 'failed')
  }
}, 60000)
```

### Reading the live feed
Subscribe to all cause wallets and the main Petty Ledger wallet via WebSocket. Decode memo field and stream to frontend via Server-Sent Events.

```javascript
client.request({
  command: 'subscribe',
  accounts: [...Object.values(CAUSE_WALLETS), PETTY_LEDGER_WALLET]
})

client.on('transaction', (tx) => {
  if (tx.transaction.Memos) {
    const memoData = tx.transaction.Memos[0].Memo.MemoData
    const decoded = JSON.parse(Buffer.from(memoData, 'hex').toString('utf8'))
    emitToFeed(decoded, tx.transaction.hash)
  }
})
```

---

## Cause Wallets

One XRPL wallet per cause. For hackathon these are wallets you control.

```javascript
const CAUSE_WALLETS = {
  'flat-earth-society':          'r...',
  'manchester-united-foundation': 'r...',
  'nra':                         'r...',
  'nickelback':                  'r...',
  'maga':                        'r...',
  'free-the-lobsters':           'r...',
  'museum-of-bad-art':           'r...',
  'longhopes-donkey-shelter':    'r...',
  'spirit-airlines':             'r...',
  'pennys-pigeon-aid':           'r...',
  'potato-association-of-america': 'r...',
  'world-carrot-museum':         'r...',
  'beefsteak-club':              'r...'
}
```

Generate and fund on testnet:
```javascript
async function setupCauseWallets() {
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233')
  await client.connect()
  for (const cause of Object.keys(CAUSE_WALLETS)) {
    const { wallet } = await client.fundWallet()
    console.log(`${cause}: ${wallet.address} / ${wallet.seed}`)
  }
  await client.disconnect()
}
```

Save all seeds in .env. Never commit to git.

---

## Telegram Integration

### Setup
1. Message @BotFather → `/newbot` → get token
2. Create public channel @thepettyledger → add bot as admin
3. Bot must receive `/start` from any user before it can message them

```javascript
const TelegramBot = require('node-telegram-bot-api')
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true })

// Store chat_id when user starts bot
bot.on('message', async (msg) => {
  if (msg.text === '/start') {
    await db.query(
      `INSERT INTO telegram_users (username, chat_id) 
       VALUES ($1, $2) 
       ON CONFLICT (username) DO UPDATE SET chat_id = $2`,
      [msg.from.username, msg.chat.id]
    )
    await bot.sendMessage(msg.chat.id,
      'The Petty Ledger is ready. The chain is watching.'
    )
  }
  // Handle magic link token callbacks
  if (msg.text?.startsWith('/resolve_')) {
    const token = msg.text.replace('/resolve_', '')
    await handleMagicLink(token, msg.chat.id)
  }
})
```

### Send card to accused
```javascript
async function sendCardToAccused(telegramHandle, cardImageBuffer, cardText) {
  const chatId = await getChatIdForHandle(telegramHandle)
  if (!chatId) {
    console.log(`No chat_id for @${telegramHandle} — they need to /start the bot first`)
    return
  }
  await bot.sendPhoto(chatId, cardImageBuffer, {
    caption: cardText,
    parse_mode: 'HTML'
  })
}
```

### Send magic link to filer (Type 4 only)
```javascript
async function sendMagicLinkToFiler(filerHandle, grievanceId, token) {
  const chatId = await getChatIdForHandle(filerHandle)
  const message =
    `Your grievance has been filed and the escrow is locked.\n\n` +
    `If the matter is corrected before the deadline, tap below to cancel the donation:\n\n` +
    `/resolve_${token}\n\n` +
    `If you do nothing, the donation fires automatically at the deadline.`
  await bot.sendMessage(chatId, message)
}
```

### Post to public channel (Type 4c — failure)
```javascript
async function postToPublicChannel(grievance, txHash) {
  const message =
    `📜 <b>Grievance Executed</b>\n\n` +
    `${grievance.anonymous ? 'Anonymous' : 'A petty person'} filed against ` +
    `<b>${grievance.accused || 'the void'}</b>.\n\n` +
    `<i>"${grievance.grievanceText}"</i>\n\n` +
    `The deadline passed. A donation of €${grievance.amount} has been made ` +
    `to <b>${grievance.causeName}</b>.\n\n` +
    `<code>tx: ${txHash}</code>\n` +
    `The chain witnessed this.`
  await bot.sendMessage('@thepettyledger', message, { parse_mode: 'HTML' })
}
```

---

## Magic Link Flow

```javascript
// Generate token on Type 4 submission
const crypto = require('crypto')
const token = crypto.randomBytes(32).toString('hex')

// Store in DB with grievance
await db.query(
  `INSERT INTO grievances (..., magic_token) VALUES (..., $1)`,
  [token]
)

// Send magic link to filer's Telegram
await sendMagicLinkToFiler(filerHandle, grievanceId, token)

// Handle magic link tap
async function handleMagicLink(token, chatId) {
  const grievance = await db.query(
    `SELECT * FROM grievances WHERE magic_token = $1 AND status = 'pending'`,
    [token]
  )
  if (!grievance.rows.length) {
    await bot.sendMessage(chatId, 'This grievance has already been resolved or the deadline has passed.')
    return
  }
  const g = grievance.rows[0]
  if (new Date() > new Date(g.deadline)) {
    await bot.sendMessage(chatId, 'The deadline has passed. The donation has already been made.')
    return
  }
  // Cancel escrow on XRPL
  await cancelEscrow(g.escrow_sequence, g.filer_address)
  // Send Card 4b to accused
  await sendCard4b(g)
  // Update DB
  await db.query(
    `UPDATE grievances SET status = 'resolved' WHERE id = $1`,
    [g.id]
  )
  await bot.sendMessage(chatId,
    'The charge has been released. The donation has been cancelled. The record stands, but the matter is closed.'
  )
}
```

---

## Certificate Generation

Generated server-side as PNG. Sent to Telegram as image.

```bash
npm install canvas
```

```javascript
const { createCanvas } = require('canvas')

async function generateCertificate(type, data) {
  const canvas = createCanvas(800, 520)
  const ctx = canvas.getContext('2d')

  // Warm off-white background
  ctx.fillStyle = '#F5F3EE'
  ctx.fillRect(0, 0, 800, 520)

  // Top rule in institutional blue
  ctx.fillStyle = '#2C4A6E'
  ctx.fillRect(0, 0, 800, 4)

  // Eyebrow
  ctx.font = '11px monospace'
  ctx.fillStyle = '#2C4A6E'
  ctx.textAlign = 'center'
  ctx.fillText(
    `CERTIFICATE OF GRIEVANCE · XRP LEDGER · ${data.txHash?.slice(0,12)}...`,
    400, 40
  )

  // Case number
  ctx.fillStyle = '#aaa'
  ctx.font = '10px monospace'
  ctx.fillText(`Case no. #${data.caseNumber}`, 400, 58)

  // Title
  ctx.font = 'italic 34px serif'
  ctx.fillStyle = '#1C1C1A'
  ctx.fillText(getCertificateTitle(type), 400, 110)

  // Grievance body
  ctx.font = 'italic 14px serif'
  ctx.fillStyle = '#444'
  wrapText(ctx, data.body, 400, 160, 680, 26)

  // Cause line (if applicable)
  if (data.cause) {
    ctx.font = '12px monospace'
    ctx.fillStyle = '#2C4A6E'
    ctx.fillText(
      `Cause: ${data.causeName} · Amount: €${data.amount}`,
      400, 400
    )
  }

  // Deadline (Type 4a only)
  if (data.deadline) {
    ctx.fillStyle = '#888'
    ctx.font = '11px monospace'
    ctx.fillText(`Deadline: ${data.deadline}`, 400, 420)
  }

  // Signoff
  ctx.font = '11px monospace'
  ctx.fillStyle = '#aaa'
  ctx.fillText(getSignoff(type), 400, 460)

  // Timestamp + hash
  ctx.font = '9px monospace'
  ctx.fillStyle = '#ccc'
  ctx.fillText(
    `${new Date().toISOString()} · xrpl.org/explorer`,
    400, 490
  )

  // Stamp (witnessed)
  drawStamp(ctx, type)

  return canvas.toBuffer('image/png')
}

function getCertificateTitle(type) {
  const titles = {
    1: 'For the Record',
    2: 'Duly Noted',
    3: 'Consider This Settled',
    '4a': 'You Have Been Notified',
    '4b': 'Matter Resolved',
    '4c': 'The Deadline Has Passed'
  }
  return titles[type] || 'Duly Noted'
}

function getSignoff(type) {
  const signoffs = {
    1: 'For the record, Petty Ledger',
    2: 'Yours in documentation, Petty Ledger',
    3: 'Justice, however small, Petty Ledger',
    '4a': 'Justice, however small, Petty Ledger',
    '4b': 'Grudgingly yours, Petty Ledger',
    '4c': 'The chain does not care about your reasons, Petty Ledger'
  }
  return signoffs[type] || 'Petty Ledger'
}

function drawStamp(ctx, type) {
  const stamps = {
    1: 'ON RECORD',
    2: 'NOTED',
    3: 'SETTLED',
    '4a': 'PENDING',
    '4b': 'RESOLVED',
    '4c': 'EXECUTED'
  }
  const text = stamps[type] || 'WITNESSED'
  ctx.save()
  ctx.translate(680, 120)
  ctx.rotate((-15 * Math.PI) / 180)
  ctx.strokeStyle = type === '4c' ? '#2C4A6E' : '#C0392B'
  ctx.lineWidth = 2
  ctx.strokeRect(-40, -18, 80, 36)
  ctx.font = 'bold 11px monospace'
  ctx.fillStyle = type === '4c' ? '#2C4A6E' : '#C0392B'
  ctx.textAlign = 'center'
  ctx.fillText(text, 0, 5)
  ctx.restore()
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ')
  let line = ''
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' '
    if (ctx.measureText(testLine).width > maxWidth && i > 0) {
      ctx.fillText(line, x, y)
      line = words[i] + ' '
      y += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, y)
}
```

---

## API Endpoints

These are called by the Lovable frontend. All XRPL logic is handled client-side via xrpl.js except for escrow auto-execution which requires a backend signer.

```
POST /api/grievance
  body: {
    type: 1|2|3|4,
    grievanceText: string,
    accusedName: string|null,
    accusedTelegram: string|null,
    filerTelegram: string|null,      // Type 4 only
    causeId: string|null,
    amount: number|null,
    deadline: ISO string|null,       // Type 4 only
    anonymous: boolean,
    txHash: string                   // submitted client-side, passed here for storage
  }
  returns: { caseNumber, success }

POST /api/grievance/:id/resolve
  (called when filer taps magic link — validates token, fires EscrowCancel)
  body: { token: string }
  returns: { success }

GET /api/feed
  returns: { grievances: [...last 50 public...] }

GET /api/feed/stream
  Server-Sent Events — real-time new grievances

GET /api/totals
  returns: { totalGrievances, totalDonated, topCause, topCity }

GET /api/causes
  returns: curated cause list with ids, names, emoji
```

---

## Database Schema

```sql
CREATE TABLE grievances (
  id SERIAL PRIMARY KEY,
  case_number VARCHAR(20) UNIQUE NOT NULL,
  type INTEGER NOT NULL,                    -- 1, 2, 3, 4
  tx_hash VARCHAR(64),
  grievance_text TEXT NOT NULL,
  accused_name VARCHAR(255),
  accused_telegram VARCHAR(100),
  filer_telegram VARCHAR(100),              -- Type 4 only
  cause_id VARCHAR(100),
  cause_name VARCHAR(255),
  amount_xrp DECIMAL(10,6),
  deadline TIMESTAMP,                       -- Type 4 only
  escrow_sequence INTEGER,                  -- Type 4 only
  filer_address VARCHAR(64),               -- Type 4 only
  magic_token VARCHAR(64),                  -- Type 4 only
  anonymous BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'filed',       -- filed | pending | resolved | failed
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE TABLE telegram_users (
  username VARCHAR(100) PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Environment Variables

```
XRPL_NETWORK=wss://s.altnet.rippletest.net:51233
XRPL_BACKEND_SEED=s...         # backend wallet for signing EscrowFinish
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHANNEL_ID=@thepettyledger
DATABASE_URL=postgres://...
PORT=3001
```

---

## Build Order (tonight)

1. Generate and fund all cause wallets on testnet
2. Set up Telegram bot, /start handler, magic link handler
3. Build POST /api/grievance — store to DB, trigger card generation
4. Build certificate generator (node-canvas)
5. Wire Telegram delivery — card to accused, magic link to filer (Type 4)
6. Build GET /api/feed and SSE stream
7. Build cron job for Type 4 auto-execution (EscrowFinish + Card 4c)
8. Build GET /api/totals
9. Test all four types end to end on testnet
10. Switch to XRPL mainnet for final submission

---

## Demo Flow for the Pitch

1. Open website live — feed already scrolling with seeded grievances
2. File a live Type 3 grievance (immediate donation) — name someone in the room, choose a cause
3. Show Card 3 appearing on the confirmation page
4. Show the certificate image
5. Open XRPL explorer — show the actual transaction with memo field
6. Show running totals — X grievances filed, €X donated
7. Briefly explain Type 4 (deadline + escrow) as the more serious mode

Total demo: under 2 minutes. Leaves 3 for story and business case.

---

## Notes

- All transactions on XRPL L1 as required by hackathon rules
- **Petty Ledger (on-chain)** is the **`petty_ledger`** contract in [`contracts/petty-ledger/`](contracts/petty-ledger/) — it records grievance-linked stake via structured memos, holds XRP, and authorizes withdrawals (filer, subject, or donation) per the rules in `src/lib.rs`. Product flows below may illustrate native `EscrowCreate` / `EscrowFinish` for narrative; wire actual custody to **`petty_ledger`** where the build targets this repo. Details: [`contracts/petty-ledger/README.md`](contracts/petty-ledger/README.md).
- Frontend connects directly to XRPL WebSocket — no REST proxy for chain access
- Memo field is XRPL's native data layer — no custom protocol needed
- Flat fee ~$0.0002 regardless of donation amount — mention in pitch
- The ledger treats a €0.50 pigeon donation with the same gravity as a million dollar transfer
