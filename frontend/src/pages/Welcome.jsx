import { Link } from 'react-router-dom';

export default function Welcome() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-brand-500 flex flex-col items-center justify-center p-6 text-white">
      <div className="text-center mb-10">
        <div className="text-7xl mb-4">🛡️</div>
        <h1 className="text-4xl font-bold mb-3">StellarGuard</h1>
        <p className="text-brand-100 text-lg max-w-sm">Trustless multi-signature treasury & automated payroll for your business — powered by Stellar.</p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        <Link to="/register" className="block w-full text-center bg-white text-brand-700 font-semibold py-3 rounded-xl shadow hover:bg-brand-50 transition">Get Started</Link>
        <Link to="/login"    className="block w-full text-center border-2 border-white text-white font-semibold py-3 rounded-xl hover:bg-white/10 transition">Sign In</Link>
      </div>
      <div className="mt-12 grid grid-cols-3 gap-6 text-center text-sm text-brand-100">
        <div><div className="text-2xl mb-1">🔐</div>Multi-Sig</div>
        <div><div className="text-2xl mb-1">🗳️</div>Proposals</div>
        <div><div className="text-2xl mb-1">💸</div>Payroll</div>
      </div>
    </div>
  );
}
