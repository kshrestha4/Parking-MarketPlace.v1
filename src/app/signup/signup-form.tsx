"use client";

import { useActionState } from "react";

import { signup, type AuthState } from "../auth/actions";

const initialState: AuthState = { error: null, message: null };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
          {state.message}
        </p>
      )}

      <div>
        <label htmlFor="full_name" className="mb-1 block text-sm font-medium">
          Full name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          className="w-full rounded-md border border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-white/40"
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-white/40"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-md border border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-white/40"
        />
        <p className="mt-1 text-xs text-zinc-500">
          At least 8 characters.
        </p>
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">I want to</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm has-[:checked]:border-white/60">
            <input type="radio" name="role" value="customer" defaultChecked />
            Find parking
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm has-[:checked]:border-white/60">
            <input type="radio" name="role" value="owner" />
            List parking
          </label>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
