"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function reviewListing(
  listingId: string,
  decision: "approved" | "rejected",
  reason = "",
) {
  // The admin check happens here on the server, not in the browser. Only an
  // admin role can approve or reject; a customer or owner never can.
  await requireRole(["admin"]);

  const supabase = await createClient();
  if (!supabase) return;

  await supabase
    .from("parking_lots")
    .update({
      status: decision,
      status_reason: decision === "rejected" ? reason.trim() || null : null,
    })
    .eq("id", listingId);

  revalidatePath("/admin");
}
