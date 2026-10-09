// The Coin ledger: every Coins rule lives here (see CONTEXT.md and docs/specs/buy-coins.md).
// Pure: takes an Account's append-only entries plus a command, returns the entries to append or a refusal.
// Balance, ownership and Withdrawable packs are always derived by replaying the entries.
import { PREMIUM_ITEMS, WITHDRAW_DAYS, packById, returnValue } from '../catalogue.js';

const DAY = 864e5;
const DEFAULT_PRICES = Object.fromEntries(PREMIUM_ITEMS.map(i => [i.id, i.price]));

// replay: which packs exist, how many of their Coins are left, which items are owned
function replay(entries) {
  const packs = new Map(); // session -> { session, packId, coins, at, left, touched, closed }
  const owned = new Map(); // itemId -> price paid
  let loose = 0; // Coins from Returns: not tied to any pack, spent first
  let debt = 0; // Coins owed after a Chargeback; paid off by the next Coins that come in
  let total = 0;
  // takes Coins from the open packs, oldest first (a Map keeps insertion order); returns what is still owed
  const drain = amount => {
    for (const p of packs.values()) {
      if (!amount) break;
      if (p.closed || !p.left) continue;
      const take = Math.min(amount, p.left);
      p.left -= take; amount -= take; p.touched = true;
    }
    return amount;
  };
  const payDebt = () => {
    debt = drain(debt);
    const fromLoose = Math.min(debt, loose);
    loose -= fromLoose; debt -= fromLoose;
  };
  const spend = amount => {
    const fromLoose = Math.min(amount, loose);
    loose -= fromLoose;
    drain(amount - fromLoose);
  };
  for (const e of entries) {
    total += e.amount;
    if (e.type === 'pack_credited') { packs.set(e.session, { session: e.session, packId: e.packId, coins: e.amount, at: e.at, left: e.amount, touched: false, closed: false }); payDebt(); }
    else if (e.type === 'item_bought') { owned.set(e.itemId, -e.amount); spend(-e.amount); }
    else if (e.type === 'item_returned') { owned.delete(e.itemId); loose += e.amount; payDebt(); }
    else if (e.type === 'pack_withdrawn') { const p = packs.get(e.session); p.closed = true; p.left = 0; }
    else if (e.type === 'chargeback') { const p = packs.get(e.session); debt += -e.amount - p.left; p.closed = true; p.left = 0; payDebt(); }
  }
  return { packs, owned, total };
}

export const balance = entries => replay(entries).total;
export const ownedItems = entries => [...replay(entries).owned.keys()];
export function withdrawablePacks(entries, now) {
  return [...replay(entries).packs.values()]
    .filter(p => !p.closed && !p.touched && now < p.at + WITHDRAW_DAYS * DAY)
    .map(p => ({ session: p.session, packId: p.packId, coins: p.coins, until: p.at + WITHDRAW_DAYS * DAY }));
}

const refuse = reason => ({ ok: false, reason });
const accept = (...entries) => ({ ok: true, entries });

export function decide(entries, cmd, now, prices = DEFAULT_PRICES) {
  const s = replay(entries);
  switch (cmd.type) {
    case 'creditPack': {
      if (s.packs.has(cmd.session)) return accept(); // the same checkout credited twice: nothing new
      const pack = packById(cmd.packId);
      if (!pack) return refuse('unknown_pack');
      return accept({ type: 'pack_credited', packId: pack.id, session: cmd.session, paymentIntent: cmd.paymentIntent ?? null, amount: pack.coins, at: now }); // the payment is kept so a refund or dispute finds its pack
    }
    case 'buyItem': {
      const price = prices[cmd.itemId];
      if (price === undefined) return refuse('unknown_item');
      if (s.owned.has(cmd.itemId)) return refuse('already_owned');
      if (s.total < 0) return refuse('negative_balance');
      if (s.total < price) return refuse('not_enough_coins');
      return accept({ type: 'item_bought', itemId: cmd.itemId, amount: -price, at: now });
    }
    case 'returnItem': {
      if (!s.owned.has(cmd.itemId)) return refuse('not_owned');
      return accept({ type: 'item_returned', itemId: cmd.itemId, amount: returnValue(s.owned.get(cmd.itemId)), at: now });
    }
    case 'withdrawPack': {
      const p = withdrawablePacks(entries, now).find(w => w.session === cmd.session);
      if (!p) return refuse('not_withdrawable');
      return accept({ type: 'pack_withdrawn', session: p.session, packId: p.packId, amount: -p.coins, at: now });
    }
    case 'chargeback': {
      const p = s.packs.get(cmd.session);
      if (!p) return refuse('unknown_pack');
      if (p.closed) return accept(); // already withdrawn or charged back: the Coins are gone already
      return accept({ type: 'chargeback', session: p.session, packId: p.packId, amount: -p.coins, at: now });
    }
    default:
      return refuse('unknown_command');
  }
}
