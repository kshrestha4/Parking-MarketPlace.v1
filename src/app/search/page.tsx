import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find parking",
};

export default function SearchPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Find parking</h1>
      <p className="mt-4 max-w-md text-zinc-400">
        The map and search are coming in the next milestone. Right now we are
        laying the foundation for listings, availability, and reservations.
      </p>
    </div>
  );
}
