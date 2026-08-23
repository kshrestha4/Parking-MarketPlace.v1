import type { Metadata } from "next";

import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  // The server does the admin check; this page can't be reached by a customer
  // or owner no matter what they type in the address bar.
  const { profile } = await requireRole(["admin"]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Signed in as {profile?.full_name}.
      </p>

      <div className="mt-10 rounded-md border border-white/10 p-6">
        <h2 className="font-medium">Admin tools</h2>
        <p className="mt-2 text-sm text-zinc-400">
          User management, listing approval, and moderation will live here in
          upcoming milestones.
        </p>
      </div>
    </div>
  );
}
