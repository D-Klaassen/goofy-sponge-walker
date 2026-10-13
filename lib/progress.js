// Saved progress (Steps, upgrades, step-bought items, records) lives on the server, one row per Account.
// Steps are earned in the browser, so the server can't know the exact number; it only accepts a save
// that could really have happened since the last one: nothing goes down, nothing grows faster than
// the game allows, and every new upgrade or item was paid for with Steps.
import { UPGRADES, STEP_ITEMS } from '../catalogue.js';

export const MIN_SAVE_GAP = 2000;   // ms between saves (the game saves every 5 s)
export const MAX_STATE_BYTES = 20000;
const GRACE = 15;                   // seconds of slack for clock drift and the request itself
const MAX_AWAY = 8 * 3600;          // the game pays at most 8 h of being away
const WALK_STEPS = 10;              // steps per second from walking, well above the real ~2
const HITS = 5;                     // keys per second, well above what a hand can do
const MAX_LEVEL = 6, UBER_MULT = 3, HIT_STEPS = 2, MAX_DIFF_MULT = 3;
const DAILY_BONUS = 500;
const MAX_STEP_M = 0.31;            // metres per step of the longest-striding character (+ rounding)

export const START = { steps: 0, total: 0, dist: 0, uberTime: 0, owned: {}, skins: ['sponge', 'classic'], best: {} };

const num = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const count = (owned, id) => owned?.[id] || 0;
const upgradeCost = (u, n) => Math.ceil(u.base * (u.grow || 1.15) ** n);

// the most Steps per second the game can hand out with these upgrades and this combo
export function maxRate(owned, combo) {
  const sps = UPGRADES.reduce((a, u) => a + (u.sps || 0) * count(owned, u.id), 0);
  const spc = 1 + UPGRADES.reduce((a, u) => a + (u.click || 0) * count(owned, u.id), 0);
  const mult = 1 + Math.floor(combo / 10) * 0.1 * (1 + count(owned, 'juice')) * MAX_DIFF_MULT;
  return (sps + WALK_STEPS) * UBER_MULT + HITS * (HIT_STEPS + MAX_LEVEL + spc) * mult;
}

// prev: the saved state (or START), next: what the browser sends, seconds: time since the last save
// -> { ok: true } | { ok: false, reason }
export function checkSave(prev, next, seconds) {
  if (!next || typeof next !== 'object' || Array.isArray(next)) return { ok: false, reason: 'bad_state' };
  if (JSON.stringify(next).length > MAX_STATE_BYTES) return { ok: false, reason: 'too_big' };
  for (const k of ['steps', 'total', 'dist']) if (!num(next[k])) return { ok: false, reason: 'bad_state' };
  if (next.uberTime != null && !num(next.uberTime)) return { ok: false, reason: 'bad_state' };
  const owned = next.owned, skins = next.skins, best = next.best || {};
  if (!owned || typeof owned !== 'object' || !Array.isArray(skins) || typeof best !== 'object') return { ok: false, reason: 'bad_state' };
  for (const [id, n] of Object.entries(owned)) {
    const u = UPGRADES.find(x => x.id === id);
    if (!u || !Number.isInteger(n) || n < 0 || (u.max && n > u.max)) return { ok: false, reason: 'bad_state' };
  }
  if (skins.some(id => !STEP_ITEMS.some(k => k.id === id))) return { ok: false, reason: 'bad_state' };
  if (Object.values(best).some(v => !Number.isInteger(v) || v < 0)) return { ok: false, reason: 'bad_state' };

  // nothing goes down
  const prevBest = prev.best || {};
  if (next.total < prev.total || next.dist < (prev.dist || 0) || (next.uberTime || 0) < (prev.uberTime || 0)) return { ok: false, reason: 'went_down' };
  if (UPGRADES.some(u => count(owned, u.id) < count(prev.owned, u.id))) return { ok: false, reason: 'went_down' };
  if ((prev.skins || []).some(id => !skins.includes(id))) return { ok: false, reason: 'went_down' };
  if (Object.entries(prevBest).some(([c, v]) => (best[c] || 0) < v)) return { ok: false, reason: 'went_down' };

  // nothing grows faster than the game allows
  const t = Math.min(Math.max(0, seconds), MAX_AWAY) + GRACE;
  const topCombo = Math.max(0, ...Object.values(best));
  if (Object.entries(best).some(([c, v]) => v - (prevBest[c] || 0) > HITS * t)) return { ok: false, reason: 'too_fast' };
  const earned = next.total - prev.total;
  if (earned > maxRate(owned, topCombo) * t + DAILY_BONUS) return { ok: false, reason: 'too_fast' };
  if (next.dist - (prev.dist || 0) > earned * MAX_STEP_M + 1) return { ok: false, reason: 'too_fast' };
  if ((next.uberTime || 0) - (prev.uberTime || 0) > t) return { ok: false, reason: 'too_fast' };

  // every new upgrade and item was paid for with Steps
  let spent = 0;
  for (const u of UPGRADES) for (let n = count(prev.owned, u.id); n < count(owned, u.id); n++) spent += upgradeCost(u, n);
  for (const id of skins) if (!(prev.skins || []).includes(id)) spent += STEP_ITEMS.find(k => k.id === id).price;
  if (next.steps > prev.steps + earned - spent + 1e-6) return { ok: false, reason: 'not_paid' };
  return { ok: true };
}
