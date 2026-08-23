import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Parking<span className="text-zinc-500">Marketplace</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-zinc-400">
          <Link href="/search" className="transition-colors hover:text-white">
            Find parking
          </Link>
          <Link href="/host" className="transition-colors hover:text-white">
            Host
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-white/15 px-4 py-1.5 transition-colors hover:border-white/40 hover:text-white"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
