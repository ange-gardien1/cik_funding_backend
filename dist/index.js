"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const supabase_js_1 = require("@supabase/supabase-js");
require("dotenv/config");
const app = new hono_1.Hono();
// Supabase client
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
// Routes
app.get('/', (c) => c.text('CIK Funding API is running'));
// Test route
app.get('/test', (c) => {
    return c.json({ message: 'Hello from Hono Backend', status: 'success' });
});
// Example: fetch content from database
app.get('/post', async (c) => {
    const { data, error } = await supabase.from('post').select('*');
    if (error) {
        return c.json({ error: error.message }, 500);
    }
    return c.json({ posts: data });
});
// Start server on Railway's assigned port
// const port = Number(process.env.PORT) || 3000;
// serve({
//   fetch: app.fetch,
//   port,
// });
exports.default = app;
