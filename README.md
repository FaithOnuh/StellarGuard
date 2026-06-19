# StellarGuard — Decentralized Multi-Sig Treasury & Payroll for SMEs

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Stellar](https://img.shields.io/badge/blockchain-Stellar-blueviolet)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![React](https://img.shields.io/badge/react-18-61dafb)
![PostgreSQL](https://img.shields.io/badge/postgres-15-336791)
![Soroban](https://img.shields.io/badge/soroban-smart--contracts-orange)

A production-ready **decentralized multi-signature treasury and payroll platform** built on the Stellar Network. StellarGuard enables small and medium enterprises (SMEs), DAOs, and cooperatives in emerging markets to manage company funds trustlessly — no single person controls the treasury.

---

## The Problem

Small businesses and cooperatives in Africa and Southeast Asia face a critical trust problem:
- A single treasurer can drain company accounts overnight
- Traditional bank multi-sig is expensive, slow, and requires physical presence
- There is no affordable, transparent on-chain treasury tool built for emerging markets

StellarGuard solves this using **Stellar's native multi-signature capabilities** combined with a **Soroban smart contract** for on-chain proposal governance.

---

## Overview

StellarGuard implements a trustless M-of-N treasury model on Stellar:

1. An **owner** creates an organisation and sets M-of-N signing rules (e.g. 2-of-3 CFO approval)
2. **Members** are added with signing weights mapped to Stellar account signers
3. Any member can **propose a spend** — a payment to an external address
4. Required signatories **approve or reject** the proposal on-chain
5. Once the threshold is reached, the treasury **auto-executes the payment**
6. **Payroll schedules** can be configured — employees receive recurring payments automatically
7. Every action is recorded on Stellar and in PostgreSQL for audit

---

## Key Features

- **M-of-N Multi-Signature** — configurable threshold (2-of-3, 3-of-5, any combo) using Stellar native multisig
- **On-Chain Proposals** — spending proposals voted on via a Soroban smart contract
- **Automated Payroll** — schedule recurring salary disbursements in XLM or USDC
- **Role-Based Members** — Owner, Admin, Signer, Viewer roles with different Stellar signing weights
- **Real-Time Audit Trail** — every approval, rejection, and payment logged on-chain + PostgreSQL
- **Treasury Dashboard** — live balance, proposal status, payroll calendar
- **Fraud Protection** — proposals expire after a configurable TTL; velocity checks on approvals
- **Redis Caching** — treasury balance cached to reduce Horizon API load
- **JWT Auth + Role Guards** — secure API with role-based access per organisation
- **Mobile-First UI** — optimised for low-bandwidth emerging markets

---

## Architecture

### Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, Tailwind CSS, Vite        |
| Backend    | Node.js, Express.js                 |
| Blockchain | Stellar SDK, Horizon API            |
| Contracts  | Soroban (Rust/WASM)                 |
| Database   | PostgreSQL 15                       |
| Cache      | Redis                               |
| Auth       | JWT + bcrypt                        |
| Network    | Stellar Testnet / Mainnet           |

---

## Project Structure

```
stellarguard/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js       # Register, login, JWT
│   │   │   ├── treasuryController.js   # Treasury CRUD, balance, signers
│   │   │   ├── proposalController.js   # Create, approve, reject, execute proposals
│   │   │   ├── payrollController.js    # Schedule, list, run payroll
│   │   │   ├── memberController.js     # Add/remove org members + weights
│   │   │   └── adminController.js      # Health, audit log, org management
│   │   ├── middleware/
│   │   │   └── auth.js                 # JWT + role + org membership guards
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── treasury.js
│   │   │   ├── proposals.js
│   │   │   ├── payroll.js
│   │   │   ├── members.js
│   │   │   └── admin.js
│   │   ├── services/
│   │   │   ├── stellar.js              # Wallet gen, multisig tx, signer management
│   │   │   ├── payrollJob.js           # Cron job for recurring payroll
│   │   │   └── redis.js               # Cache client
│   │   ├── db.js
│   │   └── index.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Welcome.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx           # Treasury overview, recent activity
│   │   │   ├── Treasury.jsx            # Balance, signers, Stellar Explorer link
│   │   │   ├── Proposals.jsx           # Create/approve/reject proposals
│   │   │   ├── Payroll.jsx             # Schedule + history
│   │   │   ├── Members.jsx             # Add/remove signers, set weights
│   │   │   └── Profile.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   └── ProposalCard.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   └── utils/
│   │       ├── api.js
│   │       └── currency.js
│   └── package.json
├── contracts/
│   └── treasury/
│       ├── src/lib.rs                  # Soroban M-of-N proposal + voting contract
│       ├── Cargo.toml
│       └── README.md
├── database/
│   ├── schema.sql
│   └── migrations/
│       ├── 001_initial_schema.js
│       └── 002_payroll_proposals.js
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── docker-compose.yml
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

---

## Multi-Signature Model

StellarGuard uses Stellar's native multi-sig by setting signing weights on the treasury account:

```
Treasury Account
  └── signers:
        ├── Alice  weight=1  (CFO)
        ├── Bob    weight=1  (CEO)
        └── Carol  weight=1  (Auditor)
  └── thresholds:
        ├── low    = 1  (read operations)
        ├── med    = 2  (payments up to limit)
        └── high   = 3  (account changes)
```

A payment proposal requires signatures from `med` threshold (2-of-3 by default).

---

## Proposal Lifecycle

```
create_proposal() → Pending
    ├── approve() × N signers → if votes >= threshold → execute_payment() → Executed
    ├── reject() by any signer → Rejected
    └── TTL expires → Expired (auto-cancelled by cron)
```

---

## Payroll Model

```sql
payroll_schedules
  ├── employee_address  VARCHAR(56)   -- Stellar public key
  ├── amount            NUMERIC
  ├── asset             VARCHAR(20)   -- XLM or USDC
  ├── frequency         VARCHAR(20)   -- weekly / biweekly / monthly
  ├── next_run_at       TIMESTAMPTZ
  └── active            BOOLEAN
```

The backend cron job (`payrollJob.js`) runs every hour, checks `next_run_at`, builds a multi-sig transaction signed by the treasury key, and broadcasts it to Horizon.

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register user + create Stellar wallet |
| POST | `/api/auth/login` | No | Login, receive JWT |
| GET  | `/api/auth/me` | Yes | Current user profile |
| POST | `/api/treasury` | Yes | Create organisation treasury |
| GET  | `/api/treasury/:id` | Member | Treasury details + balance |
| GET  | `/api/treasury/:id/signers` | Member | List current Stellar signers |
| POST | `/api/proposals` | Member | Create spending proposal |
| GET  | `/api/proposals?treasury_id=` | Member | List proposals |
| POST | `/api/proposals/:id/approve` | Signer | Approve proposal |
| POST | `/api/proposals/:id/reject` | Signer | Reject proposal |
| POST | `/api/proposals/:id/execute` | Admin | Force-execute after threshold met |
| POST | `/api/payroll` | Admin | Create payroll schedule |
| GET  | `/api/payroll?treasury_id=` | Member | List payroll schedules |
| DELETE | `/api/payroll/:id` | Admin | Cancel payroll schedule |
| POST | `/api/members` | Admin | Add member + set Stellar signer weight |
| DELETE | `/api/members/:id` | Admin | Remove member + revoke signer |
| GET  | `/api/admin/health` | Admin | Service health |
| GET  | `/api/admin/audit?treasury_id=` | Admin | Full audit log |

---

## Environment Variables

```env
PORT=5000
NODE_ENV=development

DATABASE_URL=postgresql://stellarguard:stellarguard@localhost:5432/stellarguard_db

JWT_SECRET=change_this_to_a_long_random_secret
JWT_EXPIRES_IN=7d

STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# AES-256 — must be exactly 32 characters
ENCRYPTION_KEY=your_32_character_encryption_key_

REDIS_URL=redis://localhost:6379
BALANCE_CACHE_TTL_SECONDS=30

FRONTEND_URL=http://localhost:3000

# Platform fee on payroll disbursements in basis points (100 = 1%)
FEE_BPS=100
```

---

## Quick Start

### Prerequisites
- Node.js 18+, PostgreSQL 15+, Redis 7+, Rust + cargo

### 1. Clone & Configure
```bash
git clone https://github.com/your-org/stellarguard.git
cd stellarguard
cp .env.example .env
```

### 2. Database
```bash
psql -U postgres -c "CREATE DATABASE stellarguard_db;"
cd backend && npm install && npm run migrate
```

### 3. Run
```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

### 4. Docker (Recommended)
```bash
cp .env.example .env
docker compose up -d --build
```

Access: Frontend http://localhost:3000 · API http://localhost:5000

---

## Soroban Contract

The `contracts/treasury/` Soroban contract handles on-chain proposal governance:

```bash
cd contracts/treasury
cargo build --release --target wasm32-unknown-unknown
cargo test
```

---

## Security

- Passwords hashed with **bcrypt** (cost 12)
- Stellar private keys encrypted with **AES-256-CBC** — never stored in plaintext
- JWT on all protected routes; role + org membership enforced
- Proposal TTL prevents stale approvals accumulating
- Rate limiting: 100 req/15min global, 10 req/15min on auth
- Input validation via `express-validator`
- Parameterized SQL queries throughout

---

## Roadmap

- [x] M-of-N multi-signature treasury setup
- [x] On-chain spending proposals with Soroban voting contract
- [x] Automated payroll scheduling (cron-based)
- [x] Role-based member management
- [x] Full audit trail (on-chain + PostgreSQL)
- [x] Redis balance caching
- [ ] Proposal notifications (email / push)
- [ ] Time-locked high-value proposals (24h delay)
- [ ] Mobile app (React Native)
- [ ] Fiat on-ramp integration (M-Pesa, Flutterwave, GCash)
- [ ] DAO governance token voting weights
- [ ] Hardware wallet (Ledger) signing support

---

## Contributing

Contributions are welcome! Please:
- Follow existing code patterns
- Add error handling for new features
- Document new env vars in `.env.example`
- Never commit secrets or private keys

---

## Resources

- [Stellar Multi-Sig Docs](https://developers.stellar.org/docs/learn/encyclopedia/security/signatures-multisig)
- [Stellar SDK (JavaScript)](https://github.com/stellar/js-stellar-sdk)
- [Soroban Smart Contracts](https://soroban.stellar.org/)
- [Horizon API](https://developers.stellar.org/api)
- [Stellar Expert Explorer](https://stellar.expert/)

---

## License

MIT — see [LICENSE](./LICENSE)
