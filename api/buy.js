import { route } from '../lib/server.js';

export const config = { api: { bodyParser: false } }; // raw body: Stripe signatures are checked on the exact bytes
export default route('buy', 'POST');
