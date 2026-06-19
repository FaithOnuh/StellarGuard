# StellarGuard Smart Contracts

Soroban (Rust/WASM) contracts for on-chain treasury governance.

## Contracts

| Contract | Description |
|----------|-------------|
| `treasury/` | M-of-N proposal voting + auto-execute on threshold |

## Build & Test

```bash
cd treasury
cargo build --release --target wasm32-unknown-unknown
cargo test
```

## Deploy

```bash
./deploy.sh testnet
```
