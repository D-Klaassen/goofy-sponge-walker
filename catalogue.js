// Coin packs and Premium items: shared by the shop (browser) and the server. Tune prices here, not in the logic.
// Prices are in euro cents and include 21% Dutch VAT.
export const COIN_PACKS = [
  { id: 'small', coins: 100, cents: 99, name: 'Handful of Coins' },
  { id: 'medium', coins: 550, cents: 499, name: 'Bag of Coins' },
  { id: 'large', coins: 1200, cents: 999, name: 'Chest of Coins' },
];
export const PREMIUM_ITEMS = [
  { id: 'evilcape', char: 'plankton', name: 'Evil Cape', price: 500, desc: 'A placeholder cape for the tiny evil genius.' },
];
export const RETURN_SHARE = 0.8;
export const WITHDRAW_DAYS = 14;
// Coins a Return gives back: 80% of the price, rounded up
export const returnValue = price => Math.ceil(price * RETURN_SHARE - 1e-9);
export const packById = id => COIN_PACKS.find(p => p.id === id);
export const premiumById = id => PREMIUM_ITEMS.find(p => p.id === id);
