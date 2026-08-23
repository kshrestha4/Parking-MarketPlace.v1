import { redirect } from "next/navigation";

import { createClient } from "./supabase/server";
import type { AppRole, Profile } from "./types";

export interface CurrentUser {
  user: { id: string; email: string } | null;
  profile: Profile | null;
}

// Returns the signed-in user plus their profile row. Returns nulls when there
// is no session or when Supabase isn't configured yet.
export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  if (!supabase) {
    return { user: null, profile: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    user: { id: user.id, email: user.email ?? "" },
    profile: (profile as Profile | null) ?? null,
  };
}

// Throws a redirect to the login page when no one is signed in.
export async function requireUser() {
  const { user, profile } = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return { user, profile };
}

// Redirects to the unauthorized page unless the signed-in user has one of the
// allowed roles. Role comes from the database, never from the browser.
export async function requireRole(roles: AppRole[]) {
  const { user, profile } = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!profile || !roles.includes(profile.role)) {
    redirect("/unauthorized");
  }
  return { user, profile };
}
