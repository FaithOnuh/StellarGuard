import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Profile() {
  const { user, org, logout } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => { api.get('/auth/me').then(({ data }) => setProfile(data)); }, []);

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">Profile</h2>

      <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">{user?.full_name?.[0]}</div>
          <div>
            <h3 className="font-bold text-lg">{user?.full_name}</h3>
            <p className="text-gray-500 text-sm">{user?.email}</p>
          </div>
        </div>
        {profile?.wallet && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Personal Wallet</p>
            <p className="font-mono text-xs text-gray-700 break-all">{profile.wallet}</p>
            <a href={`https://stellar.expert/explorer/testnet/account/${profile.wallet}`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 mt-1 inline-block hover:underline">View on Stellar Expert ↗</a>
          </div>
        )}
      </div>

      {org && (
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <p className="text-xs text-gray-500 mb-1">Active Organisation</p>
          <p className="font-semibold">{org.name}</p>
          <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full mt-1 inline-block">{org.role}</span>
        </div>
      )}

      <button onClick={logout} className="w-full border-2 border-red-400 text-red-500 font-semibold py-3 rounded-xl hover:bg-red-50 transition">Sign Out</button>
    </div>
  );
}
