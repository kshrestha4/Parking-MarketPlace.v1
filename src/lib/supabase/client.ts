import { createBrowserClient } from "@supabase/ssr";

import { supabasePublishableKey, supabaseUrl } from "./config";

// For use in Client Components only. Sessions live in the browser here.
export function createClient() {
  return createBrowserClient(supabaseUrl!, supabasePublishableKey!);
}
