import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-4 max-w-md text-zinc-400">
        Authentication is part of the foundation milestone, coming up next.
      </p>
    </div>
  );
}
