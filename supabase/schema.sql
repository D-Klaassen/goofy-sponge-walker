-- Coin ledger: append-only entries per Account. Balance and owned Premium items are derived from them, never stored.
create table if not exists coin_entries (
  account_id uuid not null references auth.users (id),
  seq integer not null,               -- 0, 1, 2… per Account: two requests can't both append entry n (optimistic lock)
  entry jsonb not null,               -- { type, amount, at, packId | itemId, session, paymentIntent }
  created_at timestamptz not null default now(),
  primary key (account_id, seq)
);
-- a Stripe checkout session credits at most one pack, ever
create unique index if not exists coin_entries_one_credit on coin_entries ((entry->>'session')) where entry->>'type' = 'pack_credited';
create index if not exists coin_entries_payment on coin_entries ((entry->>'paymentIntent')) where entry->>'type' = 'pack_credited';
-- only the server (service role) reads and writes; the browser never touches this table
alter table coin_entries enable row level security;
