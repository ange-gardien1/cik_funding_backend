import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const app = new Hono();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Root route
app.get('/', (c) => c.text('CIK Funding API is running 🚀'));

// Test route
app.get('/test', (c) => {
  return c.json({ message: 'Hello from Hono Backend', status: 'success' });
});

/**
 * CRUD for "post" table
 */

// READ all posts
app.get('/post', async (c) => {
  const { data, error } = await supabase.from('post').select('*');
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ posts: data });
});

// READ single post
app.get('/post/:id', async (c) => {
  const id = c.req.param('id');
  const { data, error } = await supabase.from('post').select('*').eq('id', id).single();
  if (error) return c.json({ error: error.message }, 404);
  return c.json({ post: data });
});

// CREATE a new post
app.post('/post', async (c) => {
  const body = await c.req.json();
  const { title, content } = body;

  const { data, error } = await supabase
    .from('post')
    .insert([{ title, content }])
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ post: data, message: 'Post created successfully' }, 201);
});

// UPDATE a post
app.put('/post/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { title, content } = body;

  const { data, error } = await supabase
    .from('post')
    .update({ title, content })
    .eq('id', id)
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ post: data, message: 'Post updated successfully' });
});

// DELETE a post
app.delete('/post/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const { data, error } = await supabase.from('post').delete().eq('id', id).select();
    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Post deleted successfully', deleted: data || [] });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});


export default app;
