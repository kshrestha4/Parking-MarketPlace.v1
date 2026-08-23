import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { supabaseServiceRoleKey, supabaseUrl } from "./config";

// Service role client. It bypasses row-level security and can act for any
// user, so it is only ever used on the server (signup, role assignment, admin
// actions) and never exposed to the browser.
export function createAdminClient() {
  return createSupabaseClient(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
