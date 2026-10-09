# Coins live on the server; Steps stay in the browser

The game was a single static page with its whole save in `localStorage`. Selling Coins for real money to strangers means a browser-held balance can be edited from the console and is lost when storage is cleared, so Coins and Premium items are held server-side against an Account (Vercel functions, Supabase for auth and storage, Stripe Checkout for payment, confirmed by Stripe webhook). Steps and step-bought items stay in the browser, and an Account is only required at the moment of buying, so free play keeps working with no sign-up.

## Considered options

- **Whole save on the server**: rejected for now; cheating your own Steps harms nobody, and it would force sign-in on every Player.
- **Anonymous browser ID instead of Accounts**: rejected; paying Players would lose Coins with their browser data.

## Consequences

- Steps don't follow a Player to a new device; Coins and Premium items do.
