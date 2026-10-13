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

// Bought with Steps. Shared with the server, which checks saved progress against these prices.
// upgrades: each one costs 15% more than the last (grow), up to max
export const UPGRADES = [
 {id:'shoes',name:'👟 Squeakier shoes',desc:'+1 step for every letter you hit',base:60,click:1},
 {id:'stride',name:'🦵 Longer stride',desc:'+0.5 steps per second, even while you are away',base:250,sps:.5},
 {id:'jelly',name:'🪼 Jellyfish buddy',desc:'+3 steps per second, even while you are away',base:2500,sps:3},
 {id:'juice',name:'🧃 Juicier combos',desc:'Every 10 in a row adds +10% more steps per hit',base:1500},
 {id:'diff',name:'🌶️ Spicier keys',desc:'Unlocks the next difficulty: faster keys, bigger combo multiplier',base:5000,max:3,grow:4}];
export const STEP_ITEMS = [
 {id:'sponge',type:'character',char:'sponge',name:'Sponge',pic:'🧽',paper:'#fff25a',desc:'The goofy yellow sponge himself.',price:0},
 {id:'plankton',type:'character',char:'plankton',name:'Plankton',pic:'🦠',paper:'#7fcf6a',desc:'A new character: tiny, one-eyed and full of evil plans. His steps are tiny too, so the distance goes up slowly.',price:5000},
 {id:'classic',type:'outfit',char:'sponge',name:'Classic Sponge',pic:'👔',paper:'#5fb4ea',desc:'White shirt, red tie and square brown pants.',price:0},
 {id:'princess',type:'outfit',char:'sponge',name:'Princess',pic:'👸',paper:'#ff9fcf',desc:'Pink ball gown with big puff sleeves and a heart diamond tiara.',price:1000},
];
