/* eslint-disable camelcase */
exports.up = (pgm) => {
  pgm.createTable('proposals', {
    id:           { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    org_id:       { type: 'uuid', notNull: true, references: '"organisations"', onDelete: 'CASCADE' },
    proposer_id:  { type: 'uuid', notNull: true, references: '"users"' },
    title:        { type: 'varchar(255)', notNull: true },
    description:  { type: 'text' },
    to_address:   { type: 'varchar(56)', notNull: true },
    amount:       { type: 'numeric(20,7)', notNull: true },
    asset:        { type: 'varchar(20)', notNull: true, default: 'XLM' },
    status:       { type: 'varchar(20)', notNull: true, default: 'pending' },
    votes_for:    { type: 'integer', notNull: true, default: 0 },
    votes_against:{ type: 'integer', notNull: true, default: 0 },
    stellar_hash: { type: 'varchar(64)' },
    expires_at:   { type: 'timestamptz', notNull: true, default: pgm.func("now() + interval '72 hours'") },
    created_at:   { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at:   { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('votes', {
    id:          { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    proposal_id: { type: 'uuid', notNull: true, references: '"proposals"', onDelete: 'CASCADE' },
    voter_id:    { type: 'uuid', notNull: true, references: '"users"' },
    vote:        { type: 'varchar(10)', notNull: true },
    weight:      { type: 'integer', notNull: true, default: 1 },
    created_at:  { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('votes', 'votes_proposal_voter_unique', 'UNIQUE(proposal_id, voter_id)');

  pgm.createTable('payroll_schedules', {
    id:               { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    org_id:           { type: 'uuid', notNull: true, references: '"organisations"', onDelete: 'CASCADE' },
    employee_name:    { type: 'varchar(255)', notNull: true },
    employee_address: { type: 'varchar(56)', notNull: true },
    amount:           { type: 'numeric(20,7)', notNull: true },
    asset:            { type: 'varchar(20)', notNull: true, default: 'XLM' },
    frequency:        { type: 'varchar(20)', notNull: true, default: 'monthly' },
    next_run_at:      { type: 'timestamptz', notNull: true },
    active:           { type: 'boolean', notNull: true, default: true },
    created_at:       { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('payroll_runs', {
    id:          { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    schedule_id: { type: 'uuid', notNull: true, references: '"payroll_schedules"' },
    org_id:      { type: 'uuid', notNull: true, references: '"organisations"' },
    amount:      { type: 'numeric(20,7)', notNull: true },
    asset:       { type: 'varchar(20)', notNull: true },
    stellar_hash:{ type: 'varchar(64)' },
    status:      { type: 'varchar(20)', notNull: true, default: 'success' },
    ran_at:      { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('audit_log', {
    id:          { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    org_id:      { type: 'uuid', references: '"organisations"' },
    actor_id:    { type: 'uuid', references: '"users"' },
    action:      { type: 'varchar(100)', notNull: true },
    entity_type: { type: 'varchar(50)' },
    entity_id:   { type: 'uuid' },
    metadata:    { type: 'jsonb' },
    created_at:  { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('proposals', 'org_id');
  pgm.createIndex('proposals', 'status');
  pgm.createIndex('votes', 'proposal_id');
  pgm.createIndex('payroll_schedules', 'org_id');
  pgm.createIndex('audit_log', 'org_id');
};

exports.down = (pgm) => {
  pgm.dropTable('audit_log');
  pgm.dropTable('payroll_runs');
  pgm.dropTable('payroll_schedules');
  pgm.dropTable('votes');
  pgm.dropTable('proposals');
};
