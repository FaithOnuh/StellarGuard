//! StellarGuard Treasury Contract
//!
//! On-chain M-of-N proposal governance for multi-sig treasury.
//! Members propose payments; required signatories approve/reject;
//! threshold met → auto-execute token transfer.
//!
//! Proposal lifecycle: Pending → Executed | Rejected | Expired

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, map, symbol_short,
    token, vec, Address, Env, Map, Symbol, Vec,
};

// ─── Storage Keys ───────────────────────────────────────────
const CONFIG:    Symbol = symbol_short!("CONFIG");
const PROPOSALS: Symbol = symbol_short!("PROPS");
const NEXT_ID:   Symbol = symbol_short!("NEXT_ID");

// ─── Status ─────────────────────────────────────────────────
#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum ProposalStatus {
    Pending,
    Executed,
    Rejected,
    Expired,
}

// ─── Config ─────────────────────────────────────────────────
#[contracttype]
#[derive(Clone)]
pub struct Config {
    pub admin:     Address,
    pub threshold: u32,           // approvals needed to execute
    pub members:   Vec<Address>,  // eligible voters
}

// ─── Proposal ───────────────────────────────────────────────
#[contracttype]
#[derive(Clone)]
pub struct Proposal {
    pub id:          u32,
    pub proposer:    Address,
    pub to:          Address,
    pub token:       Address,
    pub amount:      i128,
    pub status:      ProposalStatus,
    pub votes_for:   u32,
    pub votes_against: u32,
    pub voters:      Vec<Address>, // addresses that already voted
    pub expiry:      u64,          // ledger sequence
}

// ─── Events ─────────────────────────────────────────────────
const EV_INIT:     Symbol = symbol_short!("init");
const EV_PROPOSE:  Symbol = symbol_short!("propose");
const EV_VOTE:     Symbol = symbol_short!("vote");
const EV_EXECUTE:  Symbol = symbol_short!("execute");
const EV_REJECT:   Symbol = symbol_short!("reject");

#[contract]
pub struct TreasuryContract;

#[contractimpl]
impl TreasuryContract {
    /// Initialise the treasury with admin, threshold, and initial members.
    pub fn init(env: Env, admin: Address, threshold: u32, members: Vec<Address>) {
        admin.require_auth();
        assert!(!env.storage().instance().has(&CONFIG), "already initialised");
        assert!(threshold > 0 && threshold as usize <= members.len(), "invalid threshold");

        env.storage().instance().set(&CONFIG, &Config { admin, threshold, members: members.clone() });
        env.storage().instance().set(&PROPOSALS, &Map::<u32, Proposal>::new(&env));
        env.storage().instance().set(&NEXT_ID, &0u32);

        env.events().publish((EV_INIT,), (threshold, members.len() as u32));
    }

    /// Any member may propose a payment from this contract.
    /// `expiry_ledgers`: how many ledgers until this proposal expires.
    pub fn propose(
        env: Env,
        proposer: Address,
        to: Address,
        token: Address,
        amount: i128,
        expiry_ledgers: u32,
    ) -> u32 {
        proposer.require_auth();
        let config: Config = env.storage().instance().get(&CONFIG).unwrap();
        assert!(config.members.contains(&proposer), "not a member");
        assert!(amount > 0, "amount must be positive");

        let id: u32 = env.storage().instance().get(&NEXT_ID).unwrap();
        let proposal = Proposal {
            id,
            proposer: proposer.clone(),
            to,
            token,
            amount,
            status: ProposalStatus::Pending,
            votes_for: 0,
            votes_against: 0,
            voters: Vec::new(&env),
            expiry: env.ledger().sequence() + expiry_ledgers,
        };

        let mut proposals: Map<u32, Proposal> = env.storage().instance().get(&PROPOSALS).unwrap();
        proposals.set(id, proposal);
        env.storage().instance().set(&PROPOSALS, &proposals);
        env.storage().instance().set(&NEXT_ID, &(id + 1));

        env.events().publish((EV_PROPOSE,), (id, proposer, amount));
        id
    }

    /// Member casts a vote. If threshold is reached, payment is auto-executed.
    pub fn vote(env: Env, voter: Address, proposal_id: u32, approve: bool) {
        voter.require_auth();
        let config: Config = env.storage().instance().get(&CONFIG).unwrap();
        assert!(config.members.contains(&voter), "not a member");

        let mut proposals: Map<u32, Proposal> = env.storage().instance().get(&PROPOSALS).unwrap();
        let mut proposal = proposals.get(proposal_id).unwrap();

        assert!(proposal.status == ProposalStatus::Pending, "proposal not pending");
        assert!(env.ledger().sequence() <= proposal.expiry, "proposal expired");
        assert!(!proposal.voters.contains(&voter), "already voted");

        proposal.voters.push_back(voter.clone());
        if approve {
            proposal.votes_for += 1;
        } else {
            proposal.votes_against += 1;
        }

        env.events().publish((EV_VOTE,), (proposal_id, voter, approve));

        // Check if enough rejections to close early
        let rejectable = config.members.len() as u32 - proposal.votes_against;
        if rejectable < config.threshold {
            proposal.status = ProposalStatus::Rejected;
            proposals.set(proposal_id, proposal.clone());
            env.storage().instance().set(&PROPOSALS, &proposals);
            env.events().publish((EV_REJECT,), (proposal_id,));
            return;
        }

        // Auto-execute when threshold met
        if proposal.votes_for >= config.threshold {
            let tok = token::Client::new(&env, &proposal.token);
            tok.transfer(&env.current_contract_address(), &proposal.to, &proposal.amount);
            proposal.status = ProposalStatus::Executed;
            env.events().publish((EV_EXECUTE,), (proposal_id, proposal.to.clone(), proposal.amount));
        }

        proposals.set(proposal_id, proposal);
        env.storage().instance().set(&PROPOSALS, &proposals);
    }

    /// Admin can expire stale proposals past their ledger expiry.
    pub fn expire(env: Env, proposal_id: u32) {
        let mut proposals: Map<u32, Proposal> = env.storage().instance().get(&PROPOSALS).unwrap();
        let mut proposal = proposals.get(proposal_id).unwrap();
        assert!(proposal.status == ProposalStatus::Pending, "not pending");
        assert!(env.ledger().sequence() > proposal.expiry, "not yet expired");
        proposal.status = ProposalStatus::Expired;
        proposals.set(proposal_id, proposal);
        env.storage().instance().set(&PROPOSALS, &proposals);
    }

    /// Add a new member (admin only).
    pub fn add_member(env: Env, admin: Address, member: Address) {
        admin.require_auth();
        let mut config: Config = env.storage().instance().get(&CONFIG).unwrap();
        assert!(config.admin == admin, "not admin");
        config.members.push_back(member);
        env.storage().instance().set(&CONFIG, &config);
    }

    // ─── Views ──────────────────────────────────────────────
    pub fn get_proposal(env: Env, id: u32) -> Proposal {
        let proposals: Map<u32, Proposal> = env.storage().instance().get(&PROPOSALS).unwrap();
        proposals.get(id).unwrap()
    }

    pub fn get_config(env: Env) -> Config {
        env.storage().instance().get(&CONFIG).unwrap()
    }
}

// ─── Tests ──────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        token::{Client as TokenClient, StellarAssetClient},
        vec, Address, Env,
    };

    fn setup() -> (Env, TreasuryContractClient<'static>, Address, Address, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, TreasuryContract);
        let client      = TreasuryContractClient::new(&env, &contract_id);

        let admin  = Address::generate(&env);
        let alice  = Address::generate(&env);
        let bob    = Address::generate(&env);
        let carol  = Address::generate(&env);

        let token_admin = Address::generate(&env);
        let token_id    = env.register_stellar_asset_contract(token_admin.clone());
        let sac         = StellarAssetClient::new(&env, &token_id);
        // Fund the treasury contract
        sac.mint(&contract_id, &1_000_000_000);

        let members = vec![&env, alice.clone(), bob.clone(), carol.clone()];
        client.init(&admin, &2, &members); // threshold = 2 of 3

        (env, client, admin, alice, bob, carol, token_id)
    }

    #[test]
    fn test_propose_and_execute() {
        let (env, client, _, alice, bob, _carol, token_id) = setup();
        let recipient = Address::generate(&env);

        let proposal_id = client.propose(&alice, &recipient, &token_id, &500_000, &100);
        assert_eq!(client.get_proposal(proposal_id).status, ProposalStatus::Pending);

        client.vote(&alice, &proposal_id, &true);
        assert_eq!(client.get_proposal(proposal_id).votes_for, 1);

        client.vote(&bob, &proposal_id, &true); // threshold met → executes
        assert_eq!(client.get_proposal(proposal_id).status, ProposalStatus::Executed);

        let tok = TokenClient::new(&env, &token_id);
        assert_eq!(tok.balance(&recipient), 500_000);
    }

    #[test]
    fn test_reject_by_majority() {
        let (_, client, _, alice, bob, carol, token_id) = setup();
        let recipient = Address::generate(&_);

        let id = client.propose(&alice, &recipient, &token_id, &100_000, &100);
        client.vote(&alice, &id, &false);
        client.vote(&bob,   &id, &false); // 2 rejections → can never reach threshold of 2 → rejected
        assert_eq!(client.get_proposal(id).status, ProposalStatus::Rejected);
    }

    #[test]
    fn test_expire_stale_proposal() {
        let (env, client, _, alice, _bob, _carol, token_id) = setup();
        let recipient = Address::generate(&env);

        let id = client.propose(&alice, &recipient, &token_id, &100_000, &5);
        // Advance ledger past expiry
        env.ledger().with_mut(|l| l.sequence_number += 10);
        client.expire(&id);
        assert_eq!(client.get_proposal(id).status, ProposalStatus::Expired);
    }
}
