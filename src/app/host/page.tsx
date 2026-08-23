import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "List your space",
};

export default function HostPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        List your parking space
      </h1>
      <p className="mt-4 max-w-md text-zinc-400">
        Owner accounts and the listing form are next. Once they land you will
        be able to add a location, photos, pricing, and availability.
      </p>
    </div>
  );
}
