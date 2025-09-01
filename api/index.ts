import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { ethers } from 'ethers';

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




const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC!);

// $CIK contract details
const cikAbi = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)"
];
const cikContract = new ethers.Contract(
  process.env.CIK_ADDRESS!,
  cikAbi,
  provider
) as unknown as ethers.Contract;

// Backend signer (only if backend will send txs)
const backendWallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const cikWithSigner = cikContract.connect(backendWallet);



app.get('/wallet/:address/balance', async (c) => {
  try {
    const address = c.req.param('address'); // FIXED
    const balance = await cikContract.balanceOf(address);

    return c.json({
      address,
      balance: ethers.formatUnits(balance, 18),
      hasCIK: balance > 0n
    });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});


app.post('/fund/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId');
    const body = await c.req.json();
    const { funder, amount, projectWallet } = body;
    

    // Transfer tokens
  const tx = await (cikWithSigner as any).transfer(
  projectWallet,
  ethers.parseUnits(amount.toString(), 18)
);
await tx.wait();

    // Save in Supabase
    const { data, error } = await supabase
      .from('fundings')
      .insert([{ project_id: projectId, funder, amount, tx_hash: tx.hash }])
      .select()
      .single();

    if (error) throw error;

    return c.json({
      message: 'Funding successful',
      funding: data,
      txHash: tx.hash
    });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});




export default app;
