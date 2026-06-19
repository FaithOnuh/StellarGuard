const StellarSdk = require('@stellar/stellar-sdk');
const crypto = require('crypto');
const axios  = require('axios');

const isTestnet = process.env.STELLAR_NETWORK !== 'mainnet';
const server    = new StellarSdk.Horizon.Server(process.env.STELLAR_HORIZON_URL);
const networkPassphrase = isTestnet ? StellarSdk.Networks.TESTNET : StellarSdk.Networks.PUBLIC;

const ALGO = 'aes-256-cbc';

// ─── Crypto ─────────────────────────────────────────────────
const encrypt = (text) => {
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'utf8');
  const iv  = crypto.randomBytes(16);
  const c   = crypto.createCipheriv(ALGO, key, iv);
  return `${iv.toString('hex')}:${Buffer.concat([c.update(text, 'utf8'), c.final()]).toString('hex')}`;
};

const decrypt = (stored) => {
  const [ivHex, encHex] = stored.split(':');
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'utf8');
  const d   = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  return Buffer.concat([d.update(Buffer.from(encHex, 'hex')), d.final()]).toString('utf8');
};

// ─── Wallet Generation ──────────────────────────────────────
const generateWallet = async () => {
  const kp = StellarSdk.Keypair.random();
  if (isTestnet) await axios.get(`https://friendbot.stellar.org/?addr=${kp.publicKey()}`);
  return { publicKey: kp.publicKey(), encryptedSecret: encrypt(kp.secret()) };
};

// ─── Balance ────────────────────────────────────────────────
const getBalances = async (publicKey) => {
  const acc = await server.loadAccount(publicKey);
  return acc.balances.map((b) => ({
    asset: b.asset_type === 'native' ? 'XLM' : b.asset_code,
    balance: b.balance,
  }));
};

// ─── Send Payment (signed by treasury key) ──────────────────
const sendPayment = async ({ fromSecret, toAddress, amount, asset = 'XLM', memo }) => {
  const kp  = StellarSdk.Keypair.fromSecret(fromSecret);
  const acc = await server.loadAccount(kp.publicKey());
  const stellarAsset = asset === 'XLM' ? StellarSdk.Asset.native()
    : new StellarSdk.Asset(asset, process.env.USDC_ISSUER);

  const tb = new StellarSdk.TransactionBuilder(acc, { fee: StellarSdk.BASE_FEE, networkPassphrase })
    .addOperation(StellarSdk.Operation.payment({ destination: toAddress, asset: stellarAsset, amount: String(amount) }))
    .setTimeout(30);
  if (memo) tb.addMemo(StellarSdk.Memo.text(memo.slice(0, 28)));
  const tx = tb.build();
  tx.sign(kp);
  const res = await server.submitTransaction(tx);
  return res.hash;
};

// ─── Add Signer to Treasury Account ─────────────────────────
const addSigner = async ({ treasurySecret, signerPublicKey, weight }) => {
  const kp  = StellarSdk.Keypair.fromSecret(treasurySecret);
  const acc = await server.loadAccount(kp.publicKey());
  const tx  = new StellarSdk.TransactionBuilder(acc, { fee: StellarSdk.BASE_FEE, networkPassphrase })
    .addOperation(StellarSdk.Operation.setOptions({ signer: { ed25519PublicKey: signerPublicKey, weight } }))
    .setTimeout(30)
    .build();
  tx.sign(kp);
  const res = await server.submitTransaction(tx);
  return res.hash;
};

// ─── Remove Signer (weight=0) ────────────────────────────────
const removeSigner = async ({ treasurySecret, signerPublicKey }) =>
  addSigner({ treasurySecret, signerPublicKey, weight: 0 });

// ─── Set Thresholds ──────────────────────────────────────────
const setThresholds = async ({ treasurySecret, low = 1, med, high }) => {
  const kp  = StellarSdk.Keypair.fromSecret(treasurySecret);
  const acc = await server.loadAccount(kp.publicKey());
  const tx  = new StellarSdk.TransactionBuilder(acc, { fee: StellarSdk.BASE_FEE, networkPassphrase })
    .addOperation(StellarSdk.Operation.setOptions({ lowThreshold: low, medThreshold: med, highThreshold: high }))
    .setTimeout(30)
    .build();
  tx.sign(kp);
  const res = await server.submitTransaction(tx);
  return res.hash;
};

// ─── Get Signers ─────────────────────────────────────────────
const getSigners = async (publicKey) => {
  const acc = await server.loadAccount(publicKey);
  return { signers: acc.signers, thresholds: acc.thresholds };
};

module.exports = { generateWallet, getBalances, sendPayment, addSigner, removeSigner, setThresholds, getSigners, encrypt, decrypt };
