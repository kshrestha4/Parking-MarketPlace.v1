export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 py-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 text-sm text-zinc-500">
        <p>© {new Date().getFullYear()} Parking Marketplace</p>
        <p>Built for parking owners and drivers.</p>
      </div>
    </footer>
  );
}
