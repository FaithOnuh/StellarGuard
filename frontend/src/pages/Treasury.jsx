import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Treasury() {
  const { org } = useAuth();
  const [treasury, setTreasury] = useState(null);
  const [signers,  setSigners]  = useState(null);
  const [form, setForm] = useState({ name: '', threshold_med: 2, threshold_high: 3 });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!org) { setLoading(false); return; }
    Promise.all([
      api.get(`/treasury/${org.id}`),
      api.get(`/treasury/${org.id}/signers`),
    ]).then(([t, s]) => { setTreasury(t.data); setSigners(s.data); }).finally(() => setLoading(false));
  }, [org]);

  const create = async (e) => {
    e.preventDefault(); setError(''); setCreating(true);
    try {
      const { data } = await api.post('/treasury', form);
      setTreasury(data);
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setCreating(false); }
  };

  if (loading) return <div className="p-4 text-center text-gray-400 mt-20">Loading…</div>;

  if (!org) return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-6">Create Treasury</h2>
      {error && <div className="bg-red-50 text-red-600 rounded-lg p-3 mb-4 text-sm">{error}</div>}
      <form onSubmit={create} className="space-y-4 bg-white rounded-2xl p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Organisation Name</label>
          <input className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Threshold</label>
            <input type="number" min="1" className="w-full border rounded-lg px-3 py-2" value={form.threshold_med} onChange={e => setForm({ ...form, threshold_med: +e.target.value })} />
            <p className="text-xs text-gray-400 mt-0.5">Signatures for payments</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">High Threshold</label>
            <input type="number" min="1" className="w-full border rounded-lg px-3 py-2" value={form.threshold_high} onChange={e => setForm({ ...form, threshold_high: +e.target.value })} />
            <p className="text-xs text-gray-400 mt-0.5">Signatures for account changes</p>
          </div>
        </div>
        <button type="submit" disabled={creating} className="w-full bg-brand-600 text-white font-semibold py-3 rounded-xl hover:bg-brand-700 transition disabled:opacity-50">{creating ? 'Creating on Stellar…' : 'Create Treasury'}</button>
      </form>
    </div>
  );

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">Treasury</h2>

      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h3 className="font-semibold mb-3">{treasury?.name}</h3>
        <p className="text-xs text-gray-500 mb-1">Stellar Address</p>
        <p className="font-mono text-xs text-gray-800 break-all mb-2">{treasury?.treasury_public_key}</p>
        <a href={`https://stellar.expert/explorer/testnet/account/${treasury?.treasury_public_key}`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline">View on Stellar Expert ↗</a>
        <div className="mt-3 flex gap-4 text-sm">
          <span className="text-gray-500">Payment threshold: <strong>{treasury?.threshold_med}</strong></span>
          <span className="text-gray-500">High threshold: <strong>{treasury?.threshold_high}</strong></span>
        </div>
      </div>

      {/* Balances */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h3 className="font-semibold mb-3">Balances</h3>
        {treasury?.balances?.map(b => (
          <div key={b.asset} className="flex justify-between py-1.5 border-b last:border-0">
            <span className="font-medium">{b.asset}</span>
            <span className="font-mono">{parseFloat(b.balance).toFixed(4)}</span>
          </div>
        ))}
      </div>

      {/* On-chain Signers */}
      {signers && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold mb-3">On-Chain Signers</h3>
          {signers.signers?.map(s => (
            <div key={s.key} className="flex justify-between items-center py-1.5 border-b last:border-0">
              <span className="font-mono text-xs text-gray-600">{s.key.slice(0,14)}…</span>
              <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">weight {s.weight}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
