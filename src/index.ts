import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const app = new Hono();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);


// Routes
app.get('/', (c) => c.text('CIK Funding API is running'));

// app.get('/env', (c) => {
//   return c.json({
//     SUPABASE_URL: process.env.SUPABASE_URL,
//     SUPABASE_KEY: process.env.SUPABASE_KEY ? 'exists' : 'missing',
//   });
// });

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
const port = Number(process.env.PORT) || 3000;

serve({
  fetch: app.fetch,
  port,
   hostname: "0.0.0.0", // 👈 required on Railway
});


// export default app