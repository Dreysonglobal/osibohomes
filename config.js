// Supabase Configuration (shared across all pages)
const supabaseUrl = 'https://vxmzdxavjxvzcornyebd.supabase.co';
const supabaseKey = 'sb_publishable_3hSxhFhuilReZweJigvLJg_A6jQegbd';

// Create supabase client and expose it globally
function initSupabase() {
  if (!window.supabase) {
    setTimeout(initSupabase, 50);
    return;
  }
  if (!window.supabaseClient) {
    window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
  }
}

// Initialize immediately
initSupabase();
