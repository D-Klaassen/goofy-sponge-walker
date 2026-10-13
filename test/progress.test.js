import { describe, it, expect } from 'vitest';
import { checkSave, START, maxRate } from '../lib/progress.js';
import { makeHandlers } from '../lib/handlers.js';

const at = (over = {}) => ({ ...START, ...over });

describe('checkSave', () => {
  it('accepts normal play', () => {
    expect(checkSave(START, at({ steps: 40, total: 40, dist: 12 }), 5)).toEqual({ ok: true });
  });

  it('accepts buying an upgrade or item that was paid for', () => {
    const prev = at({ steps: 1100, total: 1100, dist: 300 });
    expect(checkSave(prev, at({ steps: 40, total: 1100, dist: 300, owned: { shoes: 1 }, skins: ['sponge', 'classic', 'princess'] }), 5).ok).toBe(true);
  });

  it('refuses things that were not paid for', () => {
    expect(checkSave(START, at({ owned: { jelly: 3 } }), 5)).toEqual({ ok: false, reason: 'not_paid' });
    expect(checkSave(START, at({ skins: ['sponge', 'classic', 'plankton'] }), 5)).toEqual({ ok: false, reason: 'not_paid' });
    expect(checkSave(at({ steps: 10, total: 10 }), at({ steps: 500, total: 10 }), 5)).toEqual({ ok: false, reason: 'not_paid' });
  });

  it('refuses steps earned faster than the game allows', () => {
    expect(checkSave(START, at({ steps: 1e6, total: 1e6 }), 5)).toEqual({ ok: false, reason: 'too_fast' });
    expect(checkSave(START, at({ best: { sponge: 900 } }), 5)).toEqual({ ok: false, reason: 'too_fast' });
    expect(checkSave(START, at({ uberTime: 600 }), 5)).toEqual({ ok: false, reason: 'too_fast' });
    expect(checkSave(START, at({ steps: 10, total: 10, dist: 500 }), 5)).toEqual({ ok: false, reason: 'too_fast' });
  });

  it('pays at most 8 hours of being away', () => {
    const away = Math.floor(maxRate({}, 0) * 8 * 3600);
    expect(checkSave(START, at({ steps: away, total: away }), 30 * 24 * 3600).ok).toBe(true);
    expect(checkSave(START, at({ steps: away * 2, total: away * 2 }), 30 * 24 * 3600).ok).toBe(false);
  });

  it('refuses numbers that go down', () => {
    const prev = at({ steps: 50, total: 50, dist: 15, owned: { shoes: 1 }, best: { sponge: 8 } });
    expect(checkSave(prev, at({ ...prev, total: 10 }), 5).reason).toBe('went_down');
    expect(checkSave(prev, at({ ...prev, owned: {} }), 5).reason).toBe('went_down');
    expect(checkSave(prev, at({ ...prev, best: { sponge: 2 } }), 5).reason).toBe('went_down');
    expect(checkSave(prev, at({ ...prev, skins: ['sponge'] }), 5).reason).toBe('went_down');
  });

  it('refuses malformed states', () => {
    for (const bad of [null, [], at({ steps: -1 }), at({ total: NaN }), at({ owned: { rocket: 1 } }), at({ owned: { diff: 9 } }), at({ skins: ['crown'] }), at({ best: { sponge: 1.5 } }), at({ junk: 'x'.repeat(30000) })])
      expect(checkSave(START, bad, 5).ok).toBe(false);
  });
});

// in-memory progress store with the same optimistic lock as the Supabase one
function setup() {
  const rows = new Map();
  let clock = Date.parse('2026-01-01T12:00:00Z');
  const store = {
    rows,
    progress: async id => rows.get(id) || null,
    saveProgress: async (id, state, savedAt, expected) => {
      if ((rows.get(id)?.savedAt ?? null) !== expected) return false;
      rows.set(id, { state, savedAt });
      return true;
    },
  };
  const players = { anon: { id: 'p_anon', anonymous: true, createdAt: clock - 1000 }, good: { id: 'acc_1', email: 'player@example.test', anonymous: false, createdAt: clock - 1000 } };
  const h = makeHandlers({ store, auth: async t => players[t] || null, stripe: {}, webhookSecret: '', siteUrl: '', now: () => clock });
  const call = (name, token, body) => h[name]({ headers: token ? { authorization: 'Bearer ' + token } : {}, body: body && JSON.stringify(body) });
  return { store, call, tick: ms => { clock += ms; } };
}

describe('progress endpoints', () => {
  it('save and load progress for anonymous Players', async () => {
    const { call, tick } = setup();
    expect((await call('progress', 'anon')).json).toEqual({ state: null });
    const state = at({ steps: 20, total: 20, dist: 6 });
    expect((await call('saveProgress', 'anon', { state })).status).toBe(200);
    tick(5000);
    expect((await call('progress', 'anon')).json).toEqual({ state });
  });

  it('refuse requests without a session', async () => {
    const { call } = setup();
    for (const name of ['progress', 'saveProgress', 'resetProgress']) expect((await call(name, null, {})).status).toBe(401);
  });

  it('keep Coins for Players with an email', async () => {
    const { call } = setup();
    expect((await call('checkout', 'anon', {})).status).toBe(401);
  });

  it('refuse an edited save and answer with the saved state', async () => {
    const { call, tick } = setup();
    const state = at({ steps: 20, total: 20, dist: 6 });
    await call('saveProgress', 'anon', { state });
    tick(5000);
    const r = await call('saveProgress', 'anon', { state: at({ steps: 9e9, total: 9e9, dist: 6 }) });
    expect(r).toEqual({ status: 409, json: { error: 'too_fast', state } });
  });

  it('limit how often a Player can save', async () => {
    const { call, tick } = setup();
    await call('saveProgress', 'anon', { state: START });
    tick(500);
    expect((await call('saveProgress', 'anon', { state: START })).status).toBe(429);
  });

  it('time a first save from at most a minute ago', async () => {
    const { call, store } = setup();
    store.rows.clear();
    const lots = Math.ceil(maxRate({}, 0) * 120);
    expect((await call('saveProgress', 'anon', { state: at({ steps: lots, total: lots }) })).status).toBe(409);
  });

  it('reset starts over from now', async () => {
    const { call, tick, store } = setup();
    await call('saveProgress', 'anon', { state: at({ steps: 20, total: 20, dist: 6 }) });
    tick(5000);
    expect((await call('resetProgress', 'anon')).json).toEqual({ saved: true });
    expect(store.rows.get('p_anon').state).toEqual(START);
  });
});
