import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { ethers } from 'ethers';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


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






// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// SIGN UP
app.post('/auth/signup', async (c) => {
  try {
    const { username, email, password, wallet_address } = await c.req.json();

    // Basic input validation
    if (!username || !email || !password) {
      return c.json({ error: 'Username, email, and password are required' }, 400);
    }
    if (!email.includes('@')) {
      return c.json({ error: 'Invalid email address' }, 400);
    }

    // Check if username or email already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, username, email')
      .or(`username.eq.${username},email.eq.${email}`)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existingUser) {
      if (existingUser.username === username) {
        return c.json({ error: 'Username is already taken' }, 400);
      }
      if (existingUser.email === email) {
        return c.json({ error: 'Email is already registered' }, 400);
      }
      return c.json({ error: 'Username or email already taken' }, 400);
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
    const { data, error: insertError } = await supabase
      .from('users')
      .insert([{ username, email, password_hash, wallet_address }])
      .select('id, username, email, wallet_address, role, status')
      .single();

    if (insertError) throw insertError;

    return c.json({ message: 'User created successfully', user: data }, 201);
  } catch (err) {
    console.error('Signup error:', err); // Log to server for debugging
    return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});

// SIGN IN
app.post('/auth/signin', async (c) => {
  try {
    const { username, password } = await c.req.json();

    if (!username || !password) {
      return c.json({ error: 'Username and password are required' }, 400);
    }

    // Find user by username
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (fetchError || !user) {
      return c.json({ error: 'Invalid username or password' }, 401);
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return c.json({ error: 'Invalid username or password' }, 401);
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return c.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        wallet_address: user.wallet_address,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Signin error:', err); // Log server errors
    return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});



export default app;
