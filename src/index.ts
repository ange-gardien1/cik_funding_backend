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


// Get all projects
app.get('/projects', async (c) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

// Create project
app.post('/projects', async (c) => {
  const body = await c.req.json();
  const { title, description } = body;

  const { data, error } = await supabase
    .from('projects')
    .insert([{ title, description }]);

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

// Start server
serve(app, (info) => {
  console.log(`🚀 Hono API running on http://localhost:${info.port}`);
});


