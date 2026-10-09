// The public settings the game page needs to sign in (the anon key is meant to be public; it can't touch the ledger)
export default function handler(req, res) {
  res.status(200).json({ supabaseUrl: process.env.SUPABASE_URL || null, supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null });
}
