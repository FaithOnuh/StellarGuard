#!/usr/bin/env bash
set -euo pipefail
NETWORK="${1:-testnet}"
WASM="contracts/treasury/target/wasm32-unknown-unknown/release/stellarguard_treasury.wasm"

echo "==> Building treasury contract…"
cargo build --manifest-path contracts/treasury/Cargo.toml \
  --release --target wasm32-unknown-unknown

[[ "$NETWORK" == "build" ]] && echo "Build complete: $WASM" && exit 0

echo "==> Optimising…"
soroban contract optimize --wasm "$WASM"
OPT="${WASM%.wasm}.optimized.wasm"

echo "==> Deploying to $NETWORK…"
ID=$(soroban contract deploy --wasm "$OPT" --source "$SOROBAN_SECRET_KEY" --network "$NETWORK")
echo "✅ Treasury contract: $ID (network: $NETWORK)"
