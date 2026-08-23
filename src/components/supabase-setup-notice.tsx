export function SupabaseSetupNotice() {
  return (
    <div className="mt-6 rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
      <p className="font-medium text-zinc-200">Supabase isn&apos;t connected yet.</p>
      <p className="mt-1">
        Copy <code className="rounded bg-zinc-800 px-1">.env.example</code> to{" "}
        <code className="rounded bg-zinc-800 px-1">.env.local</code> and add{" "}
        <code className="rounded bg-zinc-800 px-1">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
        and{" "}
        <code className="rounded bg-zinc-800 px-1">
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        </code>{" "}
        from your Supabase project to enable authentication.
      </p>
    </div>
  );
}
