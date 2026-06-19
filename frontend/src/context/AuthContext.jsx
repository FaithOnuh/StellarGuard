import { createContext, useContext, useState } from 'react';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('sg_token'));
  const [user,  setUser]  = useState(() => { try { return JSON.parse(localStorage.getItem('sg_user')); } catch { return null; } });
  const [org,   setOrg]   = useState(() => { try { return JSON.parse(localStorage.getItem('sg_org')); }  catch { return null; } });

  const login = (jwt, userData) => {
    localStorage.setItem('sg_token', jwt);
    localStorage.setItem('sg_user', JSON.stringify(userData));
    setToken(jwt); setUser(userData);
  };
  const selectOrg = (o) => { localStorage.setItem('sg_org', JSON.stringify(o)); setOrg(o); };
  const logout = () => {
    ['sg_token','sg_user','sg_org'].forEach(k => localStorage.removeItem(k));
    setToken(null); setUser(null); setOrg(null);
  };

  return <Ctx.Provider value={{ token, user, org, login, logout, selectOrg }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
