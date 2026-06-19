import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Payroll() {
  const { org } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [history,   setHistory]   = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm] = useState({ employee_name: '', employee_address: '', amount: '', asset: 'XLM', frequency: 'monthly', next_run_at: '' });
  const [error, setError] = useState('');

  const load = () => {
    if (!org) return;
    api.get(`/payroll?treasury_id=${org.id}`).then(({ data }) => setSchedules(data));
    api.get(`/payroll/history?treasury_id=${org.id}`).then(({ data }) => setHistory(data));
  };

  useEffect(load, [org]);

  const submit = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/payroll', { ...form, org_id: org.id, amount: parseFloat(form.amount) });
      setShowForm(false); load();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
  };

  const cancel = async (id) => {
    if (!confirm('Cancel this payroll schedule?')) return;
    await api.delete(`/payroll/${id}?org_id=${org.id}`); load();
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Payroll</h2>
        <button onClick={() => setShowForm(v => !v)} className="bg-brand-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-brand-700 transition">+ Schedule</button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-2xl p-5 shadow-sm mb-4 space-y-3">
          <h3 className="font-semibold">New Payroll Schedule</h3>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Employee Name" value={form.employee_name} onChange={e => setForm({ ...form, employee_name: e.target.value })} required />
          <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="Stellar Address G…" value={form.employee_address} onChange={e => setForm({ ...form, employee_address: e.target.value })} required />
          <div className="flex gap-3">
            <input type="number" step="0.0000001" className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            <select className="border rounded-lg px-3 py-2 text-sm" value={form.asset} onChange={e => setForm({ ...form, asset: e.target.value })}><option>XLM</option><option>USDC</option></select>
          </div>
          <div className="flex gap-3">
            <select className="flex-1 border rounded-lg px-3 py-2 text-sm" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
              <option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="monthly">Monthly</option>
            </select>
            <input type="datetime-local" className="flex-1 border rounded-lg px-3 py-2 text-sm" value={form.next_run_at} onChange={e => setForm({ ...form, next_run_at: e.target.value })} required />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-brand-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-brand-700">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      )}

      <h3 className="font-semibold mb-3">Active Schedules</h3>
      {schedules.length === 0 ? <p className="text-sm text-gray-400 mb-6">No payroll schedules</p> : (
        <div className="space-y-2 mb-6">
          {schedules.map(s => (
            <div key={s.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{s.employee_name}</p>
                <p className="text-xs text-gray-500">{s.amount} {s.asset} · {s.frequency}</p>
                <p className="text-xs text-gray-400">Next: {new Date(s.next_run_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.active ? 'Active' : 'Cancelled'}</span>
                {s.active && <button onClick={() => cancel(s.id)} className="text-red-400 hover:text-red-600 text-sm">✕</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="font-semibold mb-3">Recent Runs</h3>
      {history.length === 0 ? <p className="text-sm text-gray-400">No payroll runs yet</p> : (
        <div className="space-y-2">
          {history.map(r => (
            <div key={r.id} className="bg-white rounded-xl p-3 shadow-sm flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">{r.employee_name}</p>
                <p className="text-xs text-gray-400">{new Date(r.ran_at).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{r.amount} {r.asset}</p>
                <span className={`text-xs ${r.status === 'success' ? 'text-green-600' : 'text-red-500'}`}>{r.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
