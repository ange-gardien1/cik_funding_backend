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

// Test route
app.get('/test', (c) => {
  return c.json({ message: 'Hello from Hono Backend', status: 'success' });

});

// Example: fetch content from database
app.get('/post', async (c) => {
  const { data, error } = await supabase.from('post').select('*');
  console.log('Supabase data:', data);
  console.log('Supabase error:', error);

  if (error) {
    return c.json({ error: error.message }, 500);
  }
  return c.json({ posts: data });
});



// Start server
serve(app, (info) => {
  console.log(`🚀 Hono API running on http://localhost:${info.port}`);
});


