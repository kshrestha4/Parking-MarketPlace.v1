import type { Metadata } from "next";
import Link from "next/link";

import { SignupForm } from "./signup-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SupabaseSetupNotice } from "@/components/supabase-setup-notice";

export const metadata: Metadata = {
  title: "Create an account",
};

export default function SignupPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-20">
      <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Sign up as a customer to find parking, or as a host to list spaces.
      </p>

      {!isSupabaseConfigured() && <SupabaseSetupNotice />}

      <div className="mt-8">
        <SignupForm />
      </div>

      <p className="mt-6 text-sm text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="text-white underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
