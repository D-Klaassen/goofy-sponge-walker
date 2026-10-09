import { route } from '../lib/server.js';

export const config = { api: { bodyParser: false } }; // every route reads the raw body itself (see route() in lib/server.js)
export default route('checkout', 'POST');
