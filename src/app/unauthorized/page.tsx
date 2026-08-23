import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Not allowed",
};

export default function UnauthorizedPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Not allowed</h1>
      <p className="mt-4 max-w-md text-zinc-400">
        You don&apos;t have permission to view this page. If you think this is a
        mistake, check the account you&apos;re signed in with.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium transition-colors hover:border-white/50"
      >
        Go to your dashboard
      </Link>
    </div>
  );
}
