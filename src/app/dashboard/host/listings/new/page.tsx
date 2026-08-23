import type { Metadata } from "next";

import { requireRole } from "@/lib/auth";
import { ListingForm } from "@/components/listing-form";

export const metadata: Metadata = {
  title: "Add a parking space",
};

export default async function NewListingPage() {
  await requireRole(["owner"]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Add a parking space</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Fill in the details below. You can save a draft and come back, or
        submit it straight for review.
      </p>
      <div className="mt-8">
        <ListingForm initial={null} />
      </div>
    </div>
  );
}
