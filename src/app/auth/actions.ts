"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  isAppRole,
  validateEmail,
  validateName,
  validatePassword,
} from "@/lib/validation";
import type { AppRole } from "@/lib/types";

export interface AuthState {
  error: string | null;
  message: string | null;
}

// Turn raw Supabase/GoTrue messages into something we don't mind showing.
function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "An account with this email already exists.";
  }
  if (lower.includes("invalid login credentials")) {
    return "The email or password is incorrect.";
  }
  if (lower.includes("password")) {
    return "That password is not strong enough.";
  }
  if (lower.includes("rate limit")) {
    return "Too many attempts. Please try again in a moment.";
  }
  return "Something went wrong. Please try again.";
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const emailError = validateEmail(email);
  if (emailError) return { error: emailError, message: null };
  if (!password) return { error: "Enter your password.", message: null };

  const supabase = await createClient();
  if (!supabase) {
    return {
      error: "Authentication isn't configured yet. Set the Supabase variables.",
      message: null,
    };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: friendlyAuthError(error.message), message: null };
  }

  // Send people to the part of the app that matches their role.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let role: AppRole = "customer";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile) role = profile.role as AppRole;
  }

  revalidatePath("/");
  redirect(role === "owner" ? "/dashboard/host" : role === "admin" ? "/admin" : "/dashboard");
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "");
  const roleInput = String(formData.get("role") ?? "customer");

  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  const nameError = validateName(fullName);

  if (emailError) return { error: emailError, message: null };
  if (passwordError) return { error: passwordError, message: null };
  if (nameError) return { error: nameError, message: null };

  const supabase = await createClient();
  if (!supabase) {
    return {
      error: "Authentication isn't configured yet. Set the Supabase variables.",
      message: null,
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) {
    return { error: friendlyAuthError(error.message), message: null };
  }

  // The profile row is created by the signup trigger with role 'customer'.
  // Owner signups are promoted here with the service role, which is the only
  // caller allowed to change a role. A value sent from the browser never is.
  const userId = data.user?.id;
  if (isAppRole(roleInput) && roleInput === "owner" && userId) {
    const admin = createAdminClient();
    await admin.from("profiles").update({ role: "owner" }).eq("id", userId);
  }

  if (data.session) {
    revalidatePath("/");
    redirect("/dashboard");
  }

  return {
    error: null,
    message: "Check your email to confirm your account before signing in.",
  };
}

export async function logout() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  revalidatePath("/");
  redirect("/");
}
