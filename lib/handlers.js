// The HTTP layer: thin wiring between requests, the Coin ledger, the store and Stripe.
// Every handler takes { headers, body } (body = the raw request text) and returns { status, json }.
// Dependencies are passed in, so tests can use a fake store and Stripe's own test signatures.
import { decide, balance, ownedItems, withdrawablePacks } from './ledger.js';
import { packById, WITHDRAW_DAYS } from '../catalogue.js';

export const WAIVER = `I want my Coins delivered right away and I understand that I lose my right of withdrawal once they are delivered. (Untouched Coin packs can still be refunded within ${WITHDRAW_DAYS} days as a goodwill gesture.)`;

const reply = (status, json) => ({ status, json });
const parse = body => { try { return JSON.parse(body || '{}'); } catch { return {}; } };

// store: { entries(accountId), append(accountId, expectedCount, entries) -> boolean, findPayment(paymentIntent) -> { accountId, session } | null }
// auth: (token) -> { id, email } | null
// stripe: a Stripe client; webhookSecret: the endpoint secret; siteUrl: where the game lives; now: () -> ms
export function makeHandlers({ store, auth, stripe, webhookSecret, siteUrl, now = Date.now }) {
  const account = async headers => {
    const token = (headers.authorization || '').replace(/^Bearer /, '');
    return token ? auth(token) : null;
  };
  const view = (entries, t) => ({ balance: balance(entries), owned: ownedItems(entries), withdrawable: withdrawablePacks(entries, t) });

  // runs a ledger command and stores its entries; retries when another request appended in between
  async function run(accountId, cmd) {
    for (let tries = 0; tries < 5; tries++) {
      const entries = await store.entries(accountId);
      const t = now();
      const r = decide(entries, cmd, t);
      if (!r.ok) return { ...r, entries };
      if (!r.entries.length || await store.append(accountId, entries.length, r.entries)) return { ok: true, added: r.entries, entries: entries.concat(r.entries), at: t };
    }
    throw new Error('ledger busy');
  }
  const signedIn = fn => async req => {
    const user = await account(req.headers);
    return user ? fn(req, user) : reply(401, { error: 'sign_in_required' });
  };
  const command = makeCmd => signedIn(async (req, user) => {
    const r = await run(user.id, makeCmd(parse(req.body)));
    return r.ok ? reply(200, view(r.entries, r.at)) : reply(409, { error: r.reason });
  });

  return {
    account: signedIn(async (req, user) => reply(200, { email: user.email, ...view(await store.entries(user.id), now()) })),

    checkout: signedIn(async (req, user) => {
      const pack = packById(parse(req.body).packId);
      if (!pack) return reply(400, { error: 'unknown_pack' });
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: user.email,
        client_reference_id: user.id,
        metadata: { accountId: user.id, packId: pack.id },
        line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: pack.cents, tax_behavior: 'inclusive', product_data: { name: `${pack.coins} Coins (${pack.name})` } } }],
        consent_collection: { terms_of_service: 'required' }, // the required waiver checkbox
        custom_text: { terms_of_service_acceptance: { message: WAIVER } },
        payment_intent_data: { description: `${pack.coins} Coins. ${WAIVER}`, receipt_email: user.email }, // the receipt repeats the waiver (durable medium)
        success_url: `${siteUrl}/?coins=paid`,
        cancel_url: `${siteUrl}/?coins=cancelled`,
      });
      return reply(200, { url: session.url });
    }),

    buy: command(b => ({ type: 'buyItem', itemId: b.itemId })),
    returnItem: command(b => ({ type: 'returnItem', itemId: b.itemId })),

    withdraw: signedIn(async (req, user) => {
      const { session } = parse(req.body);
      const r = await run(user.id, { type: 'withdrawPack', session });
      if (!r.ok) return reply(409, { error: r.reason });
      const credited = r.entries.find(e => e.type === 'pack_credited' && e.session === session);
      await stripe.refunds.create({ payment_intent: credited.paymentIntent }, { idempotencyKey: `withdraw-${session}` }); // money back to the same payment method
      return reply(200, view(r.entries, r.at));
    }),

    webhook: async req => {
      let event;
      try { event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], webhookSecret); }
      catch { return reply(400, { error: 'bad_signature' }); }
      const o = event.data.object;
      if (event.type === 'checkout.session.completed' && o.payment_status === 'paid') {
        await run(o.metadata.accountId, { type: 'creditPack', packId: o.metadata.packId, session: o.id, paymentIntent: o.payment_intent });
      } else if (event.type === 'charge.dispute.created' || event.type === 'charge.refunded') {
        // a refund we made for a Withdrawal is already in the ledger (no-op); any other refund or a dispute is a Chargeback
        const found = await store.findPayment(o.payment_intent);
        if (found) await run(found.accountId, { type: 'chargeback', session: found.session });
      }
      return reply(200, { received: true });
    },
  };
}
