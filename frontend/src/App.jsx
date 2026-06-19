import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Welcome    from './pages/Welcome';
import Register   from './pages/Register';
import Login      from './pages/Login';
import Dashboard  from './pages/Dashboard';
import Treasury   from './pages/Treasury';
import Proposals  from './pages/Proposals';
import Payroll    from './pages/Payroll';
import Members    from './pages/Members';
import Profile    from './pages/Profile';
import Layout     from './components/Layout';

const Private = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/"         element={<Welcome />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login"    element={<Login />} />
      <Route element={<Private><Layout /></Private>}>
        <Route path="/dashboard"  element={<Dashboard />} />
        <Route path="/treasury"   element={<Treasury />} />
        <Route path="/proposals"  element={<Proposals />} />
        <Route path="/payroll"    element={<Payroll />} />
        <Route path="/members"    element={<Members />} />
        <Route path="/profile"    element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
