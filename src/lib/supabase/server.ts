import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./config";

// Server Components, Server Actions, and Route Handlers use this so the auth
// session is read from the user's cookies.
export async function createClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl!, supabasePublishableKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components can't write cookies. The proxy refreshes the
          // session for us, so nothing needs to happen here.
        }
      },
    },
  });
}
