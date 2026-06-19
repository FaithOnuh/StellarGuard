import api from '../utils/api';

export default function ProposalCard({ proposal, onVote, threshold }) {
  const pct = threshold ? Math.min(100, Math.round((proposal.votes_for / threshold) * 100)) : 0;
  const statusColors = { pending: 'bg-yellow-100 text-yellow-700', executed: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', expired: 'bg-gray-100 text-gray-500' };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-sm flex-1 mr-2">{proposal.title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[proposal.status] || 'bg-gray-100'}`}>{proposal.status}</span>
      </div>
      <p className="text-xs text-gray-500 mb-1">To: <span className="font-mono">{proposal.to_address?.slice(0,10)}…</span></p>
      <p className="text-sm font-bold mb-2">{proposal.amount} {proposal.asset}</p>

      {/* Vote progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Approvals: {proposal.votes_for}/{threshold}</span>
          <span>Against: {proposal.votes_against}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {proposal.status === 'pending' && onVote && (
        <div className="flex gap-2">
          <button onClick={() => onVote(proposal.id, 'approve')} className="flex-1 bg-green-500 text-white text-xs py-2 rounded-lg hover:bg-green-600 transition">✓ Approve</button>
          <button onClick={() => onVote(proposal.id, 'reject')}  className="flex-1 bg-red-400 text-white text-xs py-2 rounded-lg hover:bg-red-500 transition">✕ Reject</button>
        </div>
      )}
      {proposal.stellar_hash && (
        <a href={`https://stellar.expert/explorer/testnet/tx/${proposal.stellar_hash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 mt-2 block hover:underline">View on Stellar ↗</a>
      )}
    </div>
  );
}
