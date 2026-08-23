const LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

const STYLES: Record<string, string> = {
  draft: "border-zinc-600 text-zinc-400",
  pending: "border-amber-500/50 text-amber-300",
  approved: "border-green-500/50 text-green-300",
  rejected: "border-red-500/50 text-red-300",
  suspended: "border-red-500/50 text-red-300",
};

export function ListingStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STYLES[status] ?? "border-zinc-600 text-zinc-400"}`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
