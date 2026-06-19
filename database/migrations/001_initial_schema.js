/* eslint-disable camelcase */
exports.up = (pgm) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createTable('users', {
    id:            { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email:         { type: 'varchar(255)', notNull: true, unique: true },
    password_hash: { type: 'text', notNull: true },
    full_name:     { type: 'varchar(255)', notNull: true },
    created_at:    { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('wallets', {
    id:               { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id:          { type: 'uuid', notNull: true, references: '"users"', onDelete: 'CASCADE' },
    public_key:       { type: 'varchar(56)', notNull: true, unique: true },
    encrypted_secret: { type: 'text', notNull: true },
    created_at:       { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('organisations', {
    id:                  { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name:                { type: 'varchar(255)', notNull: true },
    owner_id:            { type: 'uuid', notNull: true, references: '"users"' },
    treasury_public_key: { type: 'varchar(56)', notNull: true, unique: true },
    treasury_secret_enc: { type: 'text', notNull: true },
    threshold_med:       { type: 'integer', notNull: true, default: 2 },
    threshold_high:      { type: 'integer', notNull: true, default: 3 },
    created_at:          { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('members', {
    id:             { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    org_id:         { type: 'uuid', notNull: true, references: '"organisations"', onDelete: 'CASCADE' },
    user_id:        { type: 'uuid', notNull: true, references: '"users"', onDelete: 'CASCADE' },
    role:           { type: 'varchar(20)', notNull: true, default: 'signer' },
    signing_weight: { type: 'integer', notNull: true, default: 1 },
    added_at:       { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('members', 'members_org_user_unique', 'UNIQUE(org_id, user_id)');

  pgm.createIndex('members', 'org_id');
  pgm.createIndex('members', 'user_id');
};

exports.down = (pgm) => {
  pgm.dropTable('members');
  pgm.dropTable('organisations');
  pgm.dropTable('wallets');
  pgm.dropTable('users');
};
