import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { fmt, toLocal, CURRENCIES } from '../utils/currency';

export default function Dashboard() {
  const { user, org, selectOrg } = useAuth();
  const navigate = useNavigate();
  const [orgs, setOrgs]         = useState([]);
  const [treasury, setTreasury] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/treasury').then(({ data }) => {
      setOrgs(data);
      const active = org || data[0];
      if (active) { selectOrg(active); loadTreasury(active.id); }
      else setLoading(false);
    });
  }, []);

  const loadTreasury = async (id) => {
    setLoading(true);
    const [t, p] = await Promise.all([
      api.get(`/treasury/${id}`),
      api.get(`/proposals?treasury_id=${id}&status=pending`),
    ]);
    setTreasury(t.data);
    setProposals(p.data.slice(0, 3));
    setLoading(false);
  };

  const xlm = treasury?.balances?.find(b => b.asset === 'XLM')?.balance || '0';

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-gray-500 text-sm">Welcome,</p>
          <h2 className="text-xl font-bold">{user?.full_name?.split(' ')[0]} 👋</h2>
        </div>
        <Link to="/profile" className="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center text-white font-bold">{user?.full_name?.[0]}</Link>
      </div>

      {/* Org Switcher */}
      {orgs.length > 1 && (
        <select className="w-full border rounded-lg px-3 py-2 mb-4 text-sm" value={org?.id || ''} onChange={e => { const o = orgs.find(x => x.id === e.target.value); selectOrg(o); loadTreasury(o.id); }}>
          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      )}

      {orgs.length === 0 && !loading ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🏦</div>
          <p className="text-gray-500 mb-4">No treasury yet. Create one to get started.</p>
          <Link to="/treasury" className="bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-700 transition">Create Treasury</Link>
        </div>
      ) : (
        <>
          {/* Balance Card */}
          <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-6 text-white mb-5 shadow-lg">
            <p className="text-brand-100 text-sm mb-1">{org?.name || 'Treasury'} Balance</p>
            {loading ? <div className="h-9 bg-white/20 rounded animate-pulse w-36" /> : (
              <>
                <p className="text-3xl font-bold">{fmt(xlm)} XLM</p>
                <p className="text-brand-100 text-sm mt-0.5">≈ {toLocal(xlm, currency)}</p>
              </>
            )}
            <div className="flex gap-2 mt-3 flex-wrap">
              {Object.keys(CURRENCIES).map(c => (
                <button key={c} onClick={() => setCurrency(c)} className={`text-xs px-2.5 py-1 rounded-full border transition ${currency===c ? 'bg-white text-brand-700 font-semibold border-white' : 'border-white/40 text-white hover:bg-white/10'}`}>{c}</button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[['🗳️','Propose','/proposals'],['💸','Payroll','/payroll'],['👥','Members','/members']].map(([icon, label, to]) => (
              <Link key={to} to={to} className="bg-white rounded-xl p-3 text-center shadow-sm hover:shadow-md transition">
                <div className="text-2xl mb-1">{icon}</div>
                <p className="text-xs font-medium text-gray-700">{label}</p>
              </Link>
            ))}
          </div>

          {/* Pending Proposals */}
          {proposals.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-800">Pending Approvals</h3>
                <Link to="/proposals" className="text-sm text-brand-600">View all</Link>
              </div>
              {proposals.map(p => (
                <div key={p.id} className="bg-white rounded-xl p-3 shadow-sm mb-2 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-gray-400">{p.votes_for} approvals · {p.amount} {p.asset}</p>
                  </div>
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Pending</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
