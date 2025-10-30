// Single Supabase client instance — load this after supabase-js script
const SUPABASE_URL = "https://funyygubkhtynzidrzce.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1bnl5Z3Via2h0eW56aWRyemNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Njg4MzYsImV4cCI6MjA3NzE0NDgzNn0.RCtoF57k3zs726XwJsAW7e7MR6CzGh61w8ByOwsCarM";

const supabaseClient =
  window.supabase && typeof window.supabase.createClient === "function"
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

window.supabaseClient = supabaseClient;

if (!supabaseClient) {
  console.error(
    "Supabase client not initialized. Ensure @supabase/supabase-js is loaded before js/supabaseClient.js"
  );
}
