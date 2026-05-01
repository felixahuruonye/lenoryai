import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

// Check if it's potentially a dashboard URL
if (supabaseUrl.includes('supabase.com/dashboard')) {
  console.error("❌ ERROR: You pasted the Supabase DASHBOARD URL. Please use the PROJECT URL from Settings -> API (e.g., https://your-id.supabase.co)");
}

export const isSupabaseConfigured = !supabaseUrl.includes('placeholder') && supabaseAnonKey !== 'placeholder' && !supabaseUrl.includes('supabase.com/dashboard');

if (!isSupabaseConfigured) {
  console.warn("⚠️ Supabase is not correctly configured. Ensure you use the PROJECT URL and ANON KEY from the Supabase API settings.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Add window type for external libs if needed
declare global {
  interface Window {
    paystackPop: any;
  }
}
