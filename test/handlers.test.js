import { describe, it, expect, vi } from 'vitest';
import Stripe from 'stripe';
import { makeHandlers, WAIVER } from '../lib/handlers.js';

const SECRET = 'whsec_test';
const stripe = new Stripe('sk_test_fake');
const T0 = Date.parse('2026-01-01T12:00:00Z');

// an in-memory store with the same contract as the Supabase one: append only succeeds when nobody appended in between
function memoryStore() {
  const rows = new Map();
  return {
    rows,
    entries: async id => [...(rows.get(id) || [])],
    append: async (id, expected, entries) => {
      const list = rows.get(id) || [];
      if (list.length !== expected) return false;
      rows.set(id, list.concat(entries));
      return true;
    },
    findPayment: async pi => {
      for (const [accountId, list] of rows) {
        const e = list.find(x => x.type === 'pack_credited' && x.paymentIntent === pi);
        if (e) return { accountId, session: e.session };
      }
      return null;
    },
  };
}

function setup() {
  const store = memoryStore();
  const fakeStripe = {
    webhooks: stripe.webhooks,
    checkout: { sessions: { create: vi.fn(async () => ({ url: 'https://checkout.stripe.test/cs_1' })) } },
    refunds: { create: vi.fn(async () => ({ id: 're_1' })) },
  };
  const auth = async token => (token === 'good' ? { id: 'acc_1', email: 'player@example.test' } : null);
  const h = makeHandlers({ store, auth, stripe: fakeStripe, webhookSecret: SECRET, siteUrl: 'https://game.test', now: () => T0 });
  return { h, store, fakeStripe };
}
const signed = event => {
  const body = JSON.stringify(event);
  return { headers: { 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload: body, secret: SECRET }) }, body };
};
const paid = (id = 'cs_1', packId = 'medium') => ({ id: 'evt_' + id, type: 'checkout.session.completed', data: { object: { id, payment_status: 'paid', payment_intent: 'pi_' + id, metadata: { accountId: 'acc_1', packId } } } });
const user = { authorization: 'Bearer good' };

describe('endpoints', () => {
  it('refuse requests without a session', async () => {
    const { h } = setup();
    for (const name of ['account', 'checkout', 'buy', 'returnItem', 'withdraw']) {
      expect((await h[name]({ headers: {}, body: '{}' })).status).toBe(401);
      expect((await h[name]({ headers: { authorization: 'Bearer bad' }, body: '{}' })).status).toBe(401);
    }
  });

  it('reject an unsigned or wrongly signed webhook', async () => {
    const { h, store } = setup();
    expect((await h.webhook({ headers: {}, body: JSON.stringify(paid()) })).status).toBe(400);
    const forged = { ...signed(paid()), body: JSON.stringify(paid('cs_9', 'large')) };
    expect((await h.webhook(forged)).status).toBe(400);
    expect(store.rows.size).toBe(0);
  });

  it('a completed checkout credits the Account once, even when replayed', async () => {
    const { h } = setup();
    expect((await h.webhook(signed(paid()))).status).toBe(200);
    expect((await h.webhook(signed(paid()))).status).toBe(200);
    const r = await h.account({ headers: user });
    expect(r.json.balance).toBe(550);
    expect(r.json.withdrawable).toHaveLength(1);
  });

  it('starts a Stripe checkout only after the waiver was ticked in the shop', async () => {
    const { h, fakeStripe } = setup();
    expect(await h.checkout({ headers: user, body: JSON.stringify({ packId: 'small' }) })).toEqual({ status: 400, json: { error: 'waiver_required' } });
    expect(fakeStripe.checkout.sessions.create).not.toHaveBeenCalled();
    const r = await h.checkout({ headers: user, body: JSON.stringify({ packId: 'small', waiver: true }) });
    expect(r).toEqual({ status: 200, json: { url: 'https://checkout.stripe.test/cs_1' } });
    const args = fakeStripe.checkout.sessions.create.mock.calls[0][0];
    expect(args.line_items[0].price_data.unit_amount).toBe(99);
    expect(args.consent_collection).toBeUndefined();
    expect(args.custom_text.submit.message).toBe(WAIVER);
    expect(args.metadata).toMatchObject({ accountId: 'acc_1', packId: 'small', waiver: 'accepted' });
    expect(new Date(args.metadata.waiverAt).getTime()).not.toBeNaN();
    expect((await h.checkout({ headers: user, body: '{"packId":"huge","waiver":true}' })).status).toBe(400);
  });

  it('buys and returns a Premium item', async () => {
    const { h } = setup();
    await h.webhook(signed(paid()));
    expect((await h.buy({ headers: user, body: '{"itemId":"evilcape"}' })).json).toMatchObject({ balance: 50, owned: ['evilcape'] });
    expect((await h.buy({ headers: user, body: '{"itemId":"evilcape"}' }))).toEqual({ status: 409, json: { error: 'already_owned' } });
    expect((await h.returnItem({ headers: user, body: '{"itemId":"evilcape"}' })).json).toMatchObject({ balance: 450, owned: [] });
  });

  it('withdraws an untouched pack and refunds the payment once', async () => {
    const { h, fakeStripe } = setup();
    await h.webhook(signed(paid()));
    const r = await h.withdraw({ headers: user, body: '{"session":"cs_1"}' });
    expect(r.json.balance).toBe(0);
    expect(fakeStripe.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_cs_1' }, { idempotencyKey: 'withdraw-cs_1' });
    // Stripe then confirms the refund: no second deduction
    await h.webhook(signed({ id: 'evt_r', type: 'charge.refunded', data: { object: { payment_intent: 'pi_cs_1', refunded: true } } }));
    expect((await h.account({ headers: user })).json.balance).toBe(0);
    expect((await h.withdraw({ headers: user, body: '{"session":"cs_1"}' })).status).toBe(409);
  });

  it('does not take Coins when the refund fails, so the Player can retry', async () => {
    const { h, fakeStripe } = setup();
    await h.webhook(signed(paid()));
    fakeStripe.refunds.create.mockRejectedValueOnce(new Error('stripe down'));
    await expect(h.withdraw({ headers: user, body: '{"session":"cs_1"}' })).rejects.toThrow();
    expect((await h.account({ headers: user })).json.balance).toBe(550);
    expect((await h.withdraw({ headers: user, body: '{"session":"cs_1"}' })).json.balance).toBe(0);
  });

  it('credits a delayed iDEAL payment when it succeeds', async () => {
    const { h } = setup();
    const pending = paid('cs_2');
    pending.data.object.payment_status = 'unpaid';
    await h.webhook(signed(pending));
    expect((await h.account({ headers: user })).json.balance).toBe(0);
    await h.webhook(signed({ ...pending, id: 'evt_async', type: 'checkout.session.async_payment_succeeded' }));
    expect((await h.account({ headers: user })).json.balance).toBe(550);
  });

  it('a partial refund made by hand leaves the Coins alone', async () => {
    const { h } = setup();
    await h.webhook(signed(paid()));
    await h.webhook(signed({ id: 'evt_p', type: 'charge.refunded', data: { object: { payment_intent: 'pi_cs_1', refunded: false } } }));
    expect((await h.account({ headers: user })).json.balance).toBe(550);
  });

  it('a dispute takes the Coins back into a negative balance', async () => {
    const { h } = setup();
    await h.webhook(signed(paid()));
    await h.buy({ headers: user, body: '{"itemId":"evilcape"}' });
    await h.webhook(signed({ id: 'evt_d', type: 'charge.dispute.created', data: { object: { payment_intent: 'pi_cs_1' } } }));
    expect((await h.account({ headers: user })).json).toMatchObject({ balance: -500, owned: ['evilcape'] });
  });
});
