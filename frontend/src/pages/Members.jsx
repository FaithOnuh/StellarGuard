import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const ROLES = ['signer', 'admin', 'viewer'];
const ROLE_COLORS = { owner: 'bg-purple-100 text-purple-700', admin: 'bg-blue-100 text-blue-700', signer: 'bg-green-100 text-green-700', viewer: 'bg-gray-100 text-gray-600' };

export default function Members() {
  const { org } = useAuth();
  const [members, setMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]   = useState({ user_email: '', role: 'signer', signing_weight: 1 });
  const [error, setError] = useState('');

  const load = () => { if (org) api.get(`/members?org_id=${org.id}`).then(({ data }) => setMembers(data)); };
  useEffect(load, [org]);

  const add = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/members', { ...form, org_id: org.id, signing_weight: parseInt(form.signing_weight) });
      setShowForm(false); setForm({ user_email: '', role: 'signer', signing_weight: 1 }); load();
    } catch (err) { setError(err.response?.data?.error || 'Failed to add member'); }
  };

  const remove = async (id) => {
    if (!confirm('Remove this member and revoke their signing access?')) return;
    await api.delete(`/members/${id}?org_id=${org.id}`); load();
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Members</h2>
        <button onClick={() => setShowForm(v => !v)} className="bg-brand-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-brand-700 transition">+ Add</button>
      </div>

      {showForm && (
        <form onSubmit={add} className="bg-white rounded-2xl p-5 shadow-sm mb-4 space-y-3">
          <h3 className="font-semibold">Add Member</h3>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <input type="email" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Member email" value={form.user_email} onChange={e => setForm({ ...form, user_email: e.target.value })} required />
          <div className="flex gap-3">
            <select className="flex-1 border rounded-lg px-3 py-2 text-sm" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
            </select>
            <input type="number" min="1" max="10" className="w-24 border rounded-lg px-3 py-2 text-sm" placeholder="Weight" value={form.signing_weight} onChange={e => setForm({ ...form, signing_weight: e.target.value })} />
          </div>
          <p className="text-xs text-gray-400">Signing weight determines vote power. Threshold: {org?.threshold_med} approvals needed.</p>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-brand-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-brand-700">Add</button>
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {members.map(m => (
          <div key={m.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand-600 rounded-full flex items-center justify-center text-white font-bold text-sm">{m.full_name?.[0]}</div>
              <div>
                <p className="text-sm font-medium">{m.full_name}</p>
                <p className="text-xs text-gray-500">{m.email}</p>
                <p className="text-xs font-mono text-gray-400">{m.wallet?.slice(0,12)}… · weight {m.signing_weight}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[m.role]}`}>{m.role}</span>
              {m.role !== 'owner' && <button onClick={() => remove(m.id)} className="text-red-400 hover:text-red-600 text-sm ml-1">✕</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
