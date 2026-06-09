# CLAUDE.md

Guidance for working in this repository. Keep it accurate — update it when behavior changes.

## What this is

**Sagra** is a touch-first, offline-tolerant point-of-sale (POS) web app for Italian
festival food stalls (*sagre*). An operator takes an order, picks a payment mode,
and prints two identical receipts (customer + kitchen). All UI text is in Italian.

Created with Create React App (TypeScript + Redux Toolkit template). Not ejected.

## Tech stack

- **React 18** + TypeScript (`react-scripts` / CRA 5)
- **Redux Toolkit** for state (`src/app/store.ts`)
- **React-Bootstrap 5** for UI
- **Firebase Firestore (lite)** for the order counter, order history, and daily portions
- **Google Sheets v4 API** as the menu source (read-only)
- **react-to-print** for receipt printing

## Commands

```bash
npm install              # install deps (no node_modules committed)
npm start                # dev server at http://localhost:3000
npm test                 # Jest in watch mode; CI=true npx react-scripts test --watchAll=false for one-shot
npm run build            # production build into build/
./node_modules/.bin/tsc --noEmit   # typecheck only (use the local TS 4.7, not global)
```

There is no linter step beyond CRA's built-in ESLint (runs during `start`/`build`).
Before pushing, run the one-shot tests **and** `npm run build` — both must pass.

## Environment

A `.env` file at the repo root is required (see `.env.example`). None of these are
secret-by-design in the client bundle, but the `.env` file is gitignored:

```
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_SAGRA_ID=...        # picks the Firestore document namespace, e.g. forno-luglio-2025
REACT_APP_SHEET_ID=...        # Google Sheet id holding the "menu" worksheet
REACT_APP_SHEETS_API_KEY=...
REACT_APP_PASSWORD=...        # optional access gate; empty/unset disables it
```

Firebase project config is hardcoded in `src/index.tsx` (project `sagra-360015`);
only the API key comes from env.

## Architecture / data flow

- **`src/index.tsx`** initializes Firebase, builds the `firestore` instance, and passes
  it as a prop down through `App`. Thunks receive `firestore` as their argument rather
  than importing it — keep that pattern.
- **`src/App.tsx`** is the whole UI shell and the order-workflow state machine. The
  `navigation` state string drives a 5-step flow:
  `pre → order → recap → pay → done` (plus a hidden `resoconto` view).
  It also owns the prefix-selection gate, the admin modal, and the cancel modal.
- **`src/features/order/orderSlice.ts`** — menu + per-order product quantities/notes +
  daily-portion tracking (thunks: `getMenu`, `getDailyPortions`,
  `forceReloadDailyPortions`, `resetSinglePortion`, `decrementPortion`).
- **`src/features/counter/counterSlice.ts`** — sequential order number. Online: 4-digit
  Firestore counter. Offline fallback: 3-digit localStorage counter with an A/B/C prefix.
- **`src/features/order/PrintableOrder.tsx`** — the `Total` payment screen, the on-screen
  `RecapOrder`, and the print-only `PrintableOrder` (renders the kitchen receipt twice
  with a page break). Receipt font sizes scale with item count.
- **`src/features/resoconto/Resoconto.tsx`** — read-only report aggregated from
  `orderHistory`. Two modes: **"Serata (ultime N ore)"** (4/6/8/12/24h rolling window,
  the right tool for an evening that crosses midnight) and **"Per giornata"** (Italian
  calendar-day tabs with parziale + progressivo). Both are computed from the same raw
  order list and split totals by payment mode.
- **`src/logOrder.js`** — writes/updates an order document in `orderHistory`.
- **`src/googleSheetsMapper.js`** — fetches the `menu` worksheet and maps header row →
  array of record objects.
- **Hooks**: `useDetectKeypress` (typed-word shortcuts), `useWakeLock` (keep screen on).

### Firestore layout

- `sagre/{SAGRA_ID}` → `{ count }`
- `sagre/{SAGRA_ID}/orderHistory/{autoId}` → order doc (`count`, `cachedQuantity`,
  `cachedEuroCents`, `created`, `products[]`, `mode`)
- `sagre/{SAGRA_ID}/dailyPortions/{YYYY-MM-DD}` → `{ date, created, portions{} }`

### Menu (Google Sheets `menu` worksheet) columns

`name`, `euroCents` (integer cents), `color` (hex), `order` (sort), `description`,
`dailyPortions` (optional limit, empty = unlimited), `criticalThreshold` (optional,
default 20). Values arrive as strings — `parseInt` before use.

## Conventions & gotchas

- **Money is integer euro-cents** everywhere. `displayEuroCents` formats for the UI; never
  carry floats.
- **Payment modes** stored on the order doc: `cash`, `bancomat`, `carta`, `servizio`
  (plus legacy `POS` in old history docs — keep handling it in reports). Merchant fees
  (0.6% bancomat, 0.9% carta) are **estimated only in the Resoconto admin view** —
  never on the payment screen, receipts, or anything customer-facing.
- **Dates use Italian time (Europe/Rome), not UTC.** Daily portions reset after 16:00
  Rome time and are keyed `YYYY-MM-DD` in Rome time; the report groups by Rome day too.
  When formatting a date for grouping, use
  `date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })`.
- **Offline-first.** Menu is cached in `localStorage["menu"]`; the order counter has a
  localStorage fallback. Code paths must not assume Firebase/Sheets are reachable.
- **Stock / daily portions are decremented atomically.** `decrementPortion` uses
  Firestore's `increment()` on a single nested field (`portions.<name>.remaining`) via a
  `FieldPath` — never a read-modify-write of the whole `portions` map (that lost updates
  across multiple products/terminals). Admin edits use `setPortionRemaining` (absolute
  write) so the server re-syncs to the operator's value. Decrements that fail offline are
  queued under `localStorage["pendingPortionDecrements"]` and replayed by
  `flushPendingPortionDecrements` on the next load. `increment` is imported as
  `fbIncrement` to avoid colliding with the local `increment` reducer action.
- **Portions are advisory, not blocking** — sold-out items can still be ordered (warning
  only), and Firebase `remaining` may go slightly negative on oversell; the UI clamps the
  displayed count at 0.
- **Access gate.** If `REACT_APP_PASSWORD` is set, `App` shows a `PasswordGate`
  before anything else. A correct password is stored in the `sagraAccess` cookie keyed
  by the current "service day" (`currentServiceDayKey`, which rolls over at 17:00
  Europe/Rome), so staff re-enter once per evening. Empty/unset password disables the
  gate (e.g. in tests). The password is in the client bundle — convenience, not security.
- **Hidden keyboard shortcuts** (type the word anywhere, handled by `useDetectKeypress`):
  - `alpaca` → clear the offline counter prefix (re-show A/B/C picker)
  - `pizza` → open the portions admin modal
  - `resoconto` → open the end-of-day report view
- The codebase is intentionally verbose with `console.log` debug output around portions —
  leave it unless asked to clean up.
- Two `.js` files (`logOrder.js`, `googleSheetsMapper.js`, `useWakeLock.js`) coexist with
  TS — `allowJs` is on. Match the existing style of the file you edit.

## Git workflow

Develop on the branch you've been assigned; commit with clear messages; push with
`git push -u origin <branch>`. Do not open a PR unless explicitly asked.
