// Reads the Supabase connection settings from the environment. These are the
// only place the keys are referenced; keeps the env var names in one spot.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Lets pages degrade gracefully before a project is wired up instead of
// throwing on a missing key at request time.
export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabasePublishableKey);
}
