import { createClient } from '@supabase/supabase-js';

// Both values are public by design (the publishable key only allows what the
// database's row-level security policies allow). They come from .env.local so
// each environment can point at its own project.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && key ? createClient(url, key) : null;
