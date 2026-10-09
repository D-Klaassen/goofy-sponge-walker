# Spec: Buying Coins with real money

See `CONTEXT.md` for the glossary and `docs/adr/0001`, `docs/adr/0002` for the decisions behind this spec.

## Problem Statement

Players can only earn Steps by walking, and there is no way to support the game or get special items by paying. The owner wants Players to be able to really buy something with real money, in a way that is safe from cheating, keeps paid value even when a browser is cleared, and follows EU/Dutch consumer rules.

## Solution

The shop gets a Coins balance and a "Buy coins" button. A Player picks a Coin pack, signs in with an email magic link (only now, not before), ticks the withdrawal-waiver checkbox and pays on Stripe's hosted checkout (iDEAL, card, etc.). When Stripe confirms the payment, the Coins appear on their Account. Coins buy Premium items (the first one is a Plankton outfit). A Premium item can be Returned at any time for 80% of its price back as Coins. An untouched Coin pack can be Withdrawn for a full money refund within 14 days. Everything paid lives on the server against the Account, so it follows the Player to any device; Steps keep working exactly as today with no sign-in.

The whole flow runs in Stripe test mode first; going live is swapping keys plus business/legal setup.

## User Stories

1. As a Player, I want to see my Coins balance in the shop, so that I know what I can buy.
2. As an anonymous Player, I want to see Coin packs and Premium items without signing in, so that I can decide if they are worth it.
3. As a Player, I want a "Buy coins" button in the shop, so that I can get Coins.
4. As a Player, I want to choose between three Coin packs with clear prices including VAT, so that I know exactly what I pay.
5. As a Player, I want bigger Coin packs to give slightly more Coins per euro, so that buying more feels rewarded.
6. As an anonymous Player, I want to be asked to sign in only when I buy, so that free play never needs an Account.
7. As a Player, I want to sign in with a magic link sent to my email, so that I don't need a password.
8. As a Player, I want to be returned to the game after signing in, so that I can continue buying where I was.
9. As a Player, I want to pay on a trusted hosted payment page with iDEAL or card, so that my payment details are safe.
10. As a Player, I want a required checkbox that explains I give up my 14-day withdrawal right when Coins are delivered immediately, so that I know my rights.
11. As a Player, I want my Coins to appear shortly after paying, so that I can use them right away.
12. As a Player, I want my Coins to be added exactly once even if I reload or the payment confirmation arrives twice, so that the balance is always correct.
13. As a Player, I want a confirmation email that repeats the waiver and what I bought, so that I have a durable record.
14. As a Player who cancels on the payment page, I want to return to the game with nothing charged, so that cancelling is safe.
15. As a Player, I want Premium items shown with a Coin price in the shop, so that I can tell them apart from Step-priced items.
16. As a Player, I want to buy a Premium item with Coins, so that I can wear something special.
17. As a Player, I want a clear message when I don't have enough Coins, with a shortcut to buy more, so that I'm not stuck.
18. As a Player playing Plankton, I want the first Premium outfit to be for Plankton, so that his outfit list isn't empty.
19. As a Player, I want Premium items I own to be wearable like any other outfit, so that they feel like part of the game.
20. As a Player, I want to Return a Premium item and get 80% of its price back as Coins, rounded up, so that I can change my mind.
21. As a Player, I want to see how many Coins a Return gives before I confirm it, so that there are no surprises.
22. As a Player, I want to buy a Returned item again later at full price, so that a Return is never permanent.
23. As a Player wearing an item I Return, I want my character to switch back to a default outfit, so that I never wear something I don't own.
24. As a Player, I want to see which of my Coin packs are still Withdrawable and until when, so that I know my options.
25. As a Player, I want to Withdraw an untouched Coin pack within 14 days and get my money back in full, so that I can undo a purchase I regret.
26. As a Player, I want spending to use my oldest pack's Coins first, so that my newest pack stays Withdrawable as long as possible.
27. As a Player, I want to understand that Coins from a Return don't make a spent pack Withdrawable again, so that the rules are clear.
28. As a Player, I want the refund to go back to the same payment method automatically, so that I don't have to do anything else.
29. As a Player, I want my Coins and Premium items to be there when I sign in on another device, so that I never lose what I paid for.
30. As a Player, I want to stay signed in between visits, so that I don't have to sign in every time.
31. As a Player, I want to sign out, so that I can share a device.
32. As a Player, I want my Steps and step-bought items to keep working exactly as today, signed in or not, so that nothing I earned changes.
33. As a Player whose bank reversed a payment (Chargeback), I want my balance to show the reversed Coins, even if negative, so that the balance is honest.
34. As a Player with a negative balance, I want to be told I need to top up before buying Premium items, so that I understand why buying is blocked.
35. As a Player with a negative balance, I want to keep my Premium items, so that a Chargeback doesn't take away what I already have.
36. As the owner, I want every Coins change recorded as a ledger entry, so that I can explain any balance and handle support questions.
37. As the owner, I want the Coins balance, Returns and Withdrawals decided only on the server, so that nobody can cheat Coins from the browser.
38. As the owner, I want Coin packs and Premium item prices in configuration, so that I can tune them without changing logic.
39. As the owner, I want to run everything in Stripe test mode, so that I can test the whole flow without real money.
40. As the owner, I want Stripe's payment notifications verified by signature, so that nobody can fake a payment.
41. As the owner, I want the game served from my own subdomain on Vercel, so that it has a proper home.

## Implementation Decisions

- **Hosting**: the static game page plus serverless functions in one Vercel project, served on a subdomain of the owner's existing site. A `package.json` is added for function dependencies and tests.
- **Payments**: Stripe Checkout (hosted page), test mode first. Payment methods include iDEAL and card. The checkout collects the withdrawal-waiver consent as a required custom checkbox. Prices include a flat 21% Dutch VAT for now (revisit Stripe Tax or a merchant of record before going live).
- **Auth and storage**: Supabase. Auth by email magic link only. Postgres stores Accounts, ledger entries and owned Premium items. The game page talks to Supabase Auth for sign-in and sends the session token to the functions.
- **Coin ledger module (the deep module)**: one pure module owns every Coins rule. It takes an Account's ledger entries plus a command and returns either the new entries to append or a refusal with a reason. Commands: credit a Coin pack, buy a Premium item, Return a Premium item, Withdraw a pack, apply a Chargeback. Queries: balance, owned Premium items, Withdrawable packs with their deadline. Rules it enforces:
  - Spending draws from the oldest pack first; a pack with any Coins spent is no longer Withdrawable; Coins from a Return never revive a pack.
  - Return gives 80% of the item's Coin price, rounded up, and removes ownership.
  - Withdrawal only within 14 days of purchase and only for an untouched pack; it removes that pack's Coins.
  - Chargeback removes the pack's Coins even if the balance goes negative; owned items stay.
  - A negative balance refuses Premium item purchases.
  - Each pack credit is keyed by the Stripe checkout session, so applying it twice is a no-op.
- **Ledger schema**: append-only entries per Account (pack credited, item bought, item returned, pack withdrawn, chargeback), each with amount, related pack or item, Stripe reference and timestamp. Balance and ownership are derived from the entries, never stored separately.
- **HTTP endpoints (Vercel functions)**:
  - Get Account: balance, owned Premium items, Withdrawable packs.
  - Start checkout for a Coin pack: requires sign-in, returns the Stripe Checkout URL.
  - Stripe webhook: verifies the signature; on completed checkout credits the pack; on dispute/chargeback applies a Chargeback; on refund confirms a Withdrawal.
  - Buy Premium item, Return Premium item, Withdraw pack: require sign-in, run the ledger command, persist the new entries; Withdraw also creates the Stripe refund.
- **Catalogue**: Coin packs (about 100 / 550 / 1200 Coins for €0.99 / €4.99 / €9.99) and Premium items (first: a placeholder Plankton outfit at about 500 Coins) live in shared configuration used by both the server and the shop.
- **Shop (game page)**: shows the Coins balance, a "Buy coins" button with the packs, Premium items with Coin prices, Return and Withdraw actions, and sign-in/sign-out. Owned Premium items join the existing outfit wearing logic; Step-priced items and the local save are unchanged.
- **Confirmation email**: sent after a successful purchase, repeating the waiver (durable medium requirement).

## Testing Decisions

- Good tests check external behaviour only: given these ledger entries and this command, this is the result. They don't reach into internals, so the module can be refactored freely.
- **Coin ledger module**: the main seam and almost all tests: oldest-pack-first spending, Withdrawable rules and 14-day boundary, Return rounding up, re-buying after a Return, Chargeback to a negative balance, negative balance blocking purchases, duplicate pack credit being a no-op.
- **HTTP endpoints**: a thin layer of tests with signed fake Stripe events and a test database, proving the wiring: a completed checkout credits the Account once even when replayed, an unsigned webhook is rejected, endpoints refuse requests without a session.
- **Game page**: no automated tests; checked by hand in the browser preview as today.
- Test runner: Vitest. There is no prior art in this codebase; this spec introduces the first tests.

## Out of Scope

- Going live with real money (business verification, real keys, terms and privacy pages, final VAT approach).
- Moving Steps or the whole save to the server.
- Google or other sign-in methods.
- Designing the Plankton Premium outfit itself (a placeholder is enough).
- Admin tooling for support; issues are handled in the Stripe and Supabase dashboards.
- Currencies other than euro.

## Further Notes

- Human-only setup (Stripe, Supabase and Vercel accounts, subdomain DNS, secrets) is a good fit for `/wizard`.
- The legal summary behind the waiver is general information, not legal advice; check before going live.
