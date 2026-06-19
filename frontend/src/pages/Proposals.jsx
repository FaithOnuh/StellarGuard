import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import ProposalCard from '../components/ProposalCard';

export default function Proposals() {
  const { org } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', to_address: '', amount: '', asset: 'XLM' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!org) return;
    setLoading(true);
    const q = filter === 'all' ? '' : `&status=${filter}`;
    api.get(`/proposals?treasury_id=${org.id}${q}`).then(({ data }) => setProposals(data)).finally(() => setLoading(false));
  };

  useEffect(load, [org, filter]);

  const submit = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/proposals', { ...form, org_id: org.id, amount: parseFloat(form.amount) });
      setShowForm(false); setForm({ title: '', description: '', to_address: '', amount: '', asset: 'XLM' }); load();
    } catch (err) { setError(err.response?.data?.error || 'Failed to create proposal'); }
  };

  const vote = async (id, v) => {
    try { await api.post(`/proposals/${id}/vote`, { vote: v }); load(); }
    catch (err) { alert(err.response?.data?.error || 'Vote failed'); }
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Proposals</h2>
        <button onClick={() => setShowForm(v => !v)} className="bg-brand-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-brand-700 transition">+ New</button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-2xl p-5 shadow-sm mb-4 space-y-3">
          <h3 className="font-semibold">New Spending Proposal</h3>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Description (optional)" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="Destination address G…" value={form.to_address} onChange={e => setForm({ ...form, to_address: e.target.value })} required />
          <div className="flex gap-3">
            <input type="number" step="0.0000001" min="0.0000001" className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            <select className="border rounded-lg px-3 py-2 text-sm" value={form.asset} onChange={e => setForm({ ...form, asset: e.target.value })}>
              <option>XLM</option><option>USDC</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-brand-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition">Submit</button>
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50 transition">Cancel</button>
          </div>
        </form>
      )}

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {['pending','executed','rejected','expired','all'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition ${filter===s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-2">🗳️</div><p>No proposals</p></div>
      ) : (
        proposals.map(p => <ProposalCard key={p.id} proposal={p} threshold={org?.threshold_med} onVote={filter === 'pending' ? vote : null} />)
      )}
    </div>
  );
}
