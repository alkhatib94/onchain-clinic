# Onchain Clinic

**A modern wallet “health check” dApp for Base** — analyze an address, resolve Base ENS, aggregate on-chain activity, and produce a clear, shareable summary with scores and badges.


---

## ✨ Features

- **Wallet Summary:** native & token tx counts, swap volume, USDC usage, wallet age, unique active days/weeks/months.  
- **Base ENS:** on-chain resolution for Base names (forward & reverse).  
- **Health Score:** composite scoring + sub-scores with a clean UI (cards + radar).  
- **Badges System:** modular badge components (activity, bridges, records, lifestyle…).  
- **Bridges & Protocols Mapping:** configurable routers/entrypoints on Base.  
- **API Layer:** `/api/summary` merges Etherscan V2 + Alchemy (via `viem`).  
- **Next.js 14 (App Router):** fast, typed, production-ready.  
- **Tailwind CSS:** modern styling with a lightweight design system.

---

## 🧱 Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript, App Router  
- **UI:** Tailwind CSS  
- **Web3:** `viem`  
- **Data Sources:** Etherscan V2 (BaseScan), Alchemy RPC, CoinGecko

---

## 📦 Project Structure (excerpt)

```
app/
  api/summary/route.ts         # API that builds the wallet summary
  badges/                      # Badge components (modular)
    BadgesGrid.tsx
    MedicationVariety.tsx
    VitalSigns.tsx
    ... (others)
  components/
    Header.tsx
    WalletBar.tsx
    MainReportTable.tsx
  page.tsx                     # Main UI (score + summary + badges)
components/
  DoctorSummary.tsx
  FinalDiagnosisCard.tsx
  ProgressRadar.tsx
config/
  brand.ts
  bridges.ts
  protocols.ts
lib/
  badges.zip                   # (assets bundle)
public/
scripts/
  discover-protocols.ts        # helper script (compiled to /dist)
```

> Your repo may include additional files like `.env.local`, `rebrand.js`, etc.

---

## 🔐 Environment Variables

Create **`.env.local`** in the project root:

```ini
# BaseScan / Etherscan V2 API key
BASESCAN_API_KEY=YOUR_KEY

# Alchemy Base RPC (HTTPS)
ALCHEMY_BASE_RPC=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# CoinGecko (optional but recommended)
COINGECKO_API=https://api.coingecko.com/api/v3/simple/price
COINGECKO_API_KEY=YOUR_COINGECKO_KEY

# Base ENS (on-chain)
BASE_ENS_REGISTRY=0xb94704422c2a1e396835a571837aa5ae53285a95
BASE_REVERSE_SUFFIX=addr.reverse

# Wallet connect project (if used in WalletBar)
REOWN_PROJECT_ID=YOUR_PROJECT_ID
```

> Do **not** commit `.env.local`. Make sure it’s in `.gitignore`.

---

## ▶️ Getting Started

```bash
# 1) Install deps
npm install

# 2) Run dev server
npm run dev
# => http://localhost:3000

# 3) Typecheck & lint (optional)
npm run typecheck
npm run lint
```

Build & Production:

```bash
npm run build
npm run start
```

---

## 🌐 Deploy

- **Vercel (recommended):**  
  1) Import the repo.  
  2) Add env vars from `.env.local` in Project Settings → Environment Variables.  
  3) Deploy the `main` branch.  

- **Docker / Custom:** build with `npm run build` then serve `/.next` using `npm run start`.

---

## 🧩 API

### `GET /api/summary?address=0x... | name=baseName`
- **Input:** an EOA/contract address *or* a Base ENS name  
- **Output:** JSON summary including:
  - `address`, `baseEns`, `balanceEth`
  - `volume` (eth/usd/usdc), `nativeTxs`, `tokenTxs`
  - `walletAgeDays`, `uniqueDays|Weeks|Months`
  - `contracts` (total/unique interactions)
  - `bridge` (native bridge usage + totals)
  - optional extras: `swaps`, `stablecoinTxs`, `usdcTrades`, etc.

---

## 🏅 Badges

Badges live under `app/badges/*`. Each badge:
- accepts the `Summary` shape
- computes its own criteria
- renders a small card (title + status + hint)

To add a badge: create a new `.tsx` in `app/badges/`, export default component, then register it in `BadgesGrid.tsx`.

---

## ⚙️ Scripts

- `scripts/discover-protocols.ts` → builds/updates protocol/router lists (compiled to `dist/discover-protocols.js`).

Run with `ts-node` or compile via your TypeScript config.

---

## 🧪 Quality

```bash
# Typecheck
npm run typecheck

# ESLint
npm run lint
```

Recommended `.gitignore` (already added):

```
.next/
node_modules/
dist/
.env*
```

---

## 🗺️ Roadmap

- PDF “Share Report” export  
- On-chain verification NFT (optional)  
- More badges (bridges, lending, DEX depth, questing)  
- Caching layer for summary API  
- Multi-network abstraction (Base-first)

---

## 🤝 Contributing

1. Fork the repo  
2. Create a feature branch: `feat/badge-newMetric`  
3. Commit with conventional messages  
4. Open a PR

---

## 📜 License

MIT — do whatever you want, just keep the notice.

---

## 🙏 Acknowledgments

- **Base** team & ecosystem  
- **Etherscan/BaseScan** APIs  
- **Alchemy** infra  
- **CoinGecko** pricing  
- Community testers & contributors

---

## 🖼️ Screenshots

> Add your screenshots under `public/` and reference them here:

- **Home / Summary**  
  `![Summary](./public/summary.png)`

- **Badges Grid**  
  `![Badges](./public/badges.png)`

