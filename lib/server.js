// Production wiring: Supabase for auth and the ledger store, Stripe for payments. Read once per function instance.
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { makeHandlers } from './handlers.js';

const env = name => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
};

let handlers;
export function getHandlers() {
  if (handlers) return handlers;
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const store = {
    async entries(accountId) {
      const { data, error } = await db.from('coin_entries').select('entry').eq('account_id', accountId).order('seq');
      if (error) throw error;
      return data.map(r => r.entry);
    },
    async append(accountId, expected, entries) {
      const { error } = await db.from('coin_entries').insert(entries.map((entry, i) => ({ account_id: accountId, seq: expected + i, entry })));
      if (!error) return true;
      if (error.code === '23505') return false; // someone appended first (or the pack is already credited): replay and decide again
      throw error;
    },
    async findPayment(paymentIntent) {
      const { data, error } = await db.from('coin_entries').select('account_id, entry').eq('entry->>type', 'pack_credited').eq('entry->>paymentIntent', paymentIntent).maybeSingle();
      if (error) throw error;
      return data && { accountId: data.account_id, session: data.entry.session };
    },
  };
  const auth = async token => {
    const { data, error } = await db.auth.getUser(token);
    return error || !data.user ? null : { id: data.user.id, email: data.user.email }; // the signed-in Account
  };
  handlers = makeHandlers({ store, auth, stripe: new Stripe(env('STRIPE_SECRET_KEY')), webhookSecret: env('STRIPE_WEBHOOK_SECRET'), siteUrl: env('SITE_URL') });
  return handlers;
}

const rawBody = req => new Promise((resolve, reject) => {
  let s = '';
  req.setEncoding('utf8');
  req.on('data', c => { s += c; });
  req.on('end', () => resolve(s));
  req.on('error', reject);
});

// turns one handler into a Vercel function (raw body, so Stripe signatures can be checked)
export const route = (name, method = 'POST') => async (req, res) => {
  if (req.method !== method) return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const r = await getHandlers()[name]({ headers: req.headers, body: await rawBody(req) });
    res.status(r.status).json(r.json);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
};
