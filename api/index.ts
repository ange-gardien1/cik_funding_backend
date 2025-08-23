import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const app = new Hono();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Root route
app.get('/', (c) => c.text('CIK Funding API is running'));

// Environment check route
app.get('/env', (c) => {
  return c.json({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY ? 'exists' : 'missing',
  });
});

// Test route
app.get('/test', (c) => {
  return c.json({ message: 'Hello from Hono Backend', status: 'success' });
});

// Example: fetch content from "post" table
app.get('/post', async (c) => {
  const { data, error } = await supabase.from('post').select('*');

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ posts: data });
});

export default app;
