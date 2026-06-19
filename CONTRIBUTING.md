# Contributing to StellarGuard

Thank you for your interest in contributing! StellarGuard is an open-source project and we welcome contributions of all kinds — bug fixes, new features, documentation improvements, and more.

---

## Getting Started

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/your-username/StellarGuard.git
   cd StellarGuard
   ```
3. **Create a branch** for your change:
   ```bash
   git checkout -b feat/your-feature-name
   ```
4. **Set up the project** locally:
   ```bash
   cp .env.example .env
   # Fill in your values
   docker compose up -d --build
   ```

---

## Development Workflow

### Backend
```bash
cd backend
npm install
npm run dev       # starts on http://localhost:5000
npm test          # run tests
npm run lint      # lint check
```

### Frontend
```bash
cd frontend
npm install
npm run dev       # starts on http://localhost:3000
npm run build     # production build
```

### Soroban Contract
```bash
cd contracts/treasury
cargo build --release --target wasm32-unknown-unknown
cargo test
```

---

## Contribution Guidelines

- **Follow existing code style** — match the patterns and naming conventions already in the codebase
- **One concern per PR** — keep pull requests focused and atomic
- **Write meaningful commit messages** — use the format `type: short description` (e.g. `feat: add proposal expiry notification`)
- **Add error handling** for any new endpoints or functions
- **Document new environment variables** in `.env.example`
- **Never commit secrets**, private keys, or `.env` files
- **Test your changes** before opening a PR

### Commit Types

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that isn't a fix or feature |
| `test` | Adding or updating tests |
| `chore` | Build process, dependencies, tooling |

---

## Pull Request Process

1. Ensure your branch is up to date with `main`
2. Run lint and tests locally — PRs that break CI will not be merged
3. Open a PR with a clear title (under 70 characters) and description:
   - **What** was changed
   - **Why** it was changed
   - **How** to test it
4. Link any related issues using `Closes #issue-number`
5. A maintainer will review within a few days

---

## Reporting Bugs

Open a GitHub Issue with:
- A clear title
- Steps to reproduce
- Expected vs actual behaviour
- Environment (OS, Node version, network: testnet/mainnet)

---

## Suggesting Features

Open a GitHub Issue with the label `enhancement`. Describe:
- The problem you're solving
- Your proposed solution
- Any alternatives you considered

---

## Code of Conduct

Be respectful, inclusive, and constructive. We are building financial infrastructure for underserved markets — every contribution matters.

---

## Resources

- [Stellar Developer Docs](https://developers.stellar.org/)
- [Soroban Smart Contracts](https://soroban.stellar.org/)
- [Stellar SDK (JavaScript)](https://github.com/stellar/js-stellar-sdk)
- [Project README](./README.md)
