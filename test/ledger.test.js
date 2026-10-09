import { describe, it, expect } from 'vitest';
import { decide, balance, ownedItems, withdrawablePacks } from '../lib/ledger.js';

const DAY = 864e5;
const T0 = Date.parse('2026-01-01T12:00:00Z');

// replays commands like the server does: each accepted command appends its entries
function play(cmds) {
  let entries = [];
  for (const [cmd, at = T0] of cmds) {
    const r = decide(entries, cmd, at);
    if (!r.ok) throw new Error(r.reason);
    entries = entries.concat(r.entries);
  }
  return entries;
}
const credit = (session, packId = 'medium') => ({ type: 'creditPack', packId, session });
const buy = itemId => ({ type: 'buyItem', itemId });
const ret = itemId => ({ type: 'returnItem', itemId });

describe('crediting a Coin pack', () => {
  it('adds the pack Coins to the balance', () => {
    expect(balance(play([[credit('cs_1')]]))).toBe(550);
  });
  it('is a no-op when the same checkout session is credited twice', () => {
    const entries = play([[credit('cs_1')]]);
    const r = decide(entries, credit('cs_1'), T0);
    expect(r).toEqual({ ok: true, entries: [] });
  });
  it('refuses an unknown pack', () => {
    expect(decide([], credit('cs_1', 'huge'), T0)).toMatchObject({ ok: false, reason: 'unknown_pack' });
  });
});

describe('buying a Premium item', () => {
  it('spends its Coin price and owns the item', () => {
    const e = play([[credit('cs_1')], [buy('evilcape')]]);
    expect(balance(e)).toBe(50);
    expect(ownedItems(e)).toEqual(['evilcape']);
  });
  it('refuses when there are not enough Coins', () => {
    const e = play([[credit('cs_1', 'small')]]);
    expect(decide(e, buy('evilcape'), T0)).toMatchObject({ ok: false, reason: 'not_enough_coins' });
  });
  it('refuses an item already owned', () => {
    const e = play([[credit('cs_1', 'large')], [buy('evilcape')]]);
    expect(decide(e, buy('evilcape'), T0)).toMatchObject({ ok: false, reason: 'already_owned' });
  });
  it('refuses an unknown item', () => {
    expect(decide([], buy('nope'), T0)).toMatchObject({ ok: false, reason: 'unknown_item' });
  });
});

describe('returning a Premium item', () => {
  it('gives 80% back rounded up and removes ownership', () => {
    const e = play([[credit('cs_1')], [buy('evilcape')], [ret('evilcape')]]);
    expect(balance(e)).toBe(50 + 400);
    expect(ownedItems(e)).toEqual([]);
  });
  it('rounds the 80% up', () => {
    const prices = { evilcape: 333 };
    const e = play([[credit('cs_1')]]);
    const bought = e.concat(decide(e, buy('evilcape'), T0, prices).entries);
    expect(decide(bought, ret('evilcape'), T0, prices).entries[0].amount).toBe(267);
  });
  it('refuses an item not owned', () => {
    expect(decide([], ret('evilcape'), T0)).toMatchObject({ ok: false, reason: 'not_owned' });
  });
  it('lets the item be bought again at full price', () => {
    const e = play([[credit('cs_1', 'large')], [buy('evilcape')], [ret('evilcape')], [buy('evilcape')]]);
    expect(balance(e)).toBe(1200 - 500 + 400 - 500);
    expect(ownedItems(e)).toEqual(['evilcape']);
  });
});

describe('Withdrawable packs', () => {
  it('an untouched pack is withdrawable for 14 days', () => {
    const e = play([[credit('cs_1')]]);
    expect(withdrawablePacks(e, T0 + 14 * DAY - 1)).toEqual([{ session: 'cs_1', packId: 'medium', coins: 550, until: T0 + 14 * DAY }]);
    expect(withdrawablePacks(e, T0 + 14 * DAY)).toEqual([]);
  });
  it('spending draws from the oldest pack first', () => {
    const e = play([[credit('cs_1')], [credit('cs_2'), T0 + DAY], [buy('evilcape'), T0 + 2 * DAY]]);
    expect(withdrawablePacks(e, T0 + 2 * DAY).map(p => p.session)).toEqual(['cs_2']);
  });
  it('a pack is touched once any Coin of it is spent', () => {
    const e = play([[credit('cs_1', 'small')], [credit('cs_2')], [buy('evilcape')]]);
    expect(withdrawablePacks(e, T0)).toEqual([]);
  });
  it('Coins from a Return never revive a pack', () => {
    const e = play([[credit('cs_1')], [buy('evilcape')], [ret('evilcape')]]);
    expect(withdrawablePacks(e, T0)).toEqual([]);
  });
  it('Coins from a Return are spent before pack Coins', () => {
    // 400 back from the Return + 50 left in the old pack pay a 450 item: the new pack stays untouched
    const e = play([[credit('cs_1')], [buy('evilcape')], [ret('evilcape')], [credit('cs_2'), T0 + DAY]]);
    const after = e.concat(decide(e, buy('evilcape'), T0 + DAY, { evilcape: 450 }).entries);
    expect(withdrawablePacks(after, T0 + DAY).map(p => p.session)).toEqual(['cs_2']);
  });
});

describe('withdrawing a pack', () => {
  it('removes the pack Coins', () => {
    const e = play([[credit('cs_1')], [{ type: 'withdrawPack', session: 'cs_1' }, T0 + DAY]]);
    expect(balance(e)).toBe(0);
    expect(withdrawablePacks(e, T0 + DAY)).toEqual([]);
  });
  it('refuses after 14 days', () => {
    const e = play([[credit('cs_1')]]);
    expect(decide(e, { type: 'withdrawPack', session: 'cs_1' }, T0 + 14 * DAY)).toMatchObject({ ok: false, reason: 'not_withdrawable' });
  });
  it('refuses a touched pack', () => {
    const e = play([[credit('cs_1')], [buy('evilcape')]]);
    expect(decide(e, { type: 'withdrawPack', session: 'cs_1' }, T0)).toMatchObject({ ok: false, reason: 'not_withdrawable' });
  });
  it('refuses twice', () => {
    const e = play([[credit('cs_1')], [{ type: 'withdrawPack', session: 'cs_1' }]]);
    expect(decide(e, { type: 'withdrawPack', session: 'cs_1' }, T0)).toMatchObject({ ok: false, reason: 'not_withdrawable' });
  });
});

describe('Chargeback', () => {
  it('takes the pack Coins back even into a negative balance and keeps items', () => {
    const e = play([[credit('cs_1')], [buy('evilcape')], [{ type: 'chargeback', session: 'cs_1' }]]);
    expect(balance(e)).toBe(50 - 550);
    expect(ownedItems(e)).toEqual(['evilcape']);
  });
  it('a negative balance blocks Premium purchases', () => {
    const e = play([[credit('cs_1')], [buy('evilcape')], [{ type: 'chargeback', session: 'cs_1' }], [credit('cs_2', 'large')]]);
    expect(balance(e)).toBe(700);
    expect(decide(e, ret('evilcape'), T0).ok).toBe(true);
    const neg = play([[credit('cs_1')], [buy('evilcape')], [{ type: 'chargeback', session: 'cs_1' }]]);
    expect(decide(neg.concat(decide(neg, ret('evilcape'), T0).entries), buy('evilcape'), T0)).toMatchObject({ ok: false, reason: 'negative_balance' });
  });
  it('Coins that pay off a negative balance make the new pack touched', () => {
    const e = play([[credit('cs_1')], [buy('evilcape')], [{ type: 'chargeback', session: 'cs_1' }], [credit('cs_2', 'large')]]);
    expect(withdrawablePacks(e, T0)).toEqual([]);
  });
  it('is a no-op when applied twice, and on a withdrawn pack', () => {
    const e = play([[credit('cs_1')], [{ type: 'chargeback', session: 'cs_1' }]]);
    expect(decide(e, { type: 'chargeback', session: 'cs_1' }, T0)).toEqual({ ok: true, entries: [] });
    const w = play([[credit('cs_2')], [{ type: 'withdrawPack', session: 'cs_2' }]]);
    expect(decide(w, { type: 'chargeback', session: 'cs_2' }, T0)).toEqual({ ok: true, entries: [] });
  });
  it('refuses an unknown pack session', () => {
    expect(decide([], { type: 'chargeback', session: 'cs_x' }, T0)).toMatchObject({ ok: false, reason: 'unknown_pack' });
  });
});
