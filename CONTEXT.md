# Goofy Sponge Walker

An idle walking game: a character walks down a road, and the player fills the goofy meter by pressing the keys that pop up.

## Language

**Steps**:
The currency earned by walking. Spent in the shop on characters and outfits.
_Avoid_: points, score

**Coins**:
A currency that can only be bought with real money. Never earned by walking.
_Avoid_: gems, credits, premium steps

**Coin pack**:
A fixed amount of Coins sold for a fixed real-money price.
_Avoid_: bundle, top-up

**Premium item**:
A shop item priced in Coins instead of Steps.
_Avoid_: paid item, pro item

**Player**:
Anyone playing the game. Anonymous until they buy something.

**Account**:
What a Player gets by signing in, required at the moment of buying a Coin pack. Owns the Player's Coins and Premium items, so they survive on any device.
_Avoid_: user, profile, customer

**Return**:
A Player gives a Premium item back and gets 80% of its Coin price back as Coins, rounded up. Allowed at any time; the item can be bought again at full price.
_Avoid_: refund, restore, sell back

**Withdrawal**:
Getting real money back for a Coin pack. Only possible within 14 days of buying, and only while none of that pack's Coins have been spent. The legal right of withdrawal is waived at checkout; this is offered on top as goodwill.
_Avoid_: refund, return

**Withdrawable pack**:
A Coin pack that can still be withdrawn. Spending uses the oldest pack's Coins first; once any of a pack's Coins are spent it stops being withdrawable, and Coins from a Return don't change that.

**Chargeback**:
The Player's bank reverses a Coin pack payment. The pack's Coins are taken back even if that makes the balance negative; Premium items already owned stay.
_Avoid_: dispute, withdrawal

## Relationships

- Steps and Coins are separate currencies; one never converts into the other.
- A **Coin pack** is the only way to get **Coins**.
- Coins buy only **Premium items**; existing items stay priced in Steps.
- **Coins** and **Premium items** belong to an **Account**; Steps and step-bought items stay with the browser.
- A **Return** gives back Coins, never money; a **Withdrawal** gives back money, never Coins.
- While an **Account** has a negative Coin balance it can't buy **Premium items**.
- Anonymous Players can see **Premium items** and **Coin packs**; buying either asks them to sign in first.
