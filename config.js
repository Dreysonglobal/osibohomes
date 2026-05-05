// Supabase Configuration (shared across all pages)
const supabaseUrl = 'https://vxtuidediqvspyfhijfl.supabase.co';
const supabaseKey = 'sb_publishable_nBS_1O-8VCkga-iiovwjow__cRbRRUa';

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
