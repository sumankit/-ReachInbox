"use client";

import { useMemo, useState } from "react";
import { EmailJob } from "@/types";
import { EmptyState, Spinner } from "./ui/States";
import { ClockIcon, FilterIcon, RefreshIcon, SearchIcon, StarIcon } from "./ui/Icons";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function formatRowTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusPill({ job, mode }: { job: EmailJob; mode: "scheduled" | "sent" }) {
  if (mode === "scheduled") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
        <ClockIcon width={12} height={12} />
        {formatRowTime(job.scheduledAt)}
      </span>
    );
  }
  if (job.status === "FAILED") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
      Sent
    </span>
  );
}

export function EmailTable({
  jobs,
  loading,
  mode,
  onRefresh,
}: {
  jobs: EmailJob[];
  loading: boolean;
  mode: "scheduled" | "sent";
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(
      (j) => j.recipient.toLowerCase().includes(q) || j.subject.toLowerCase().includes(q)
    );
  }, [jobs, query]);

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" width={16} height={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full rounded-2xl bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Filter">
          <FilterIcon width={18} height={18} />
        </button>
        <button onClick={onRefresh} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Refresh">
          <RefreshIcon width={18} height={18} />
        </button>
      </div>

      <div className="mt-2">
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={mode === "scheduled" ? "No scheduled emails yet" : "No sent emails yet"}
            subtitle={
              mode === "scheduled"
                ? "Compose a new email to schedule your first send."
                : "Sent emails will show up here."
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((job) => (
              <li key={job.id} className="flex items-center gap-4 py-4">
                <span className="w-40 shrink-0 truncate text-sm text-slate-800">To: {job.recipient}</span>
                <StatusPill job={job} mode={mode} />
                <p className="min-w-0 flex-1 truncate text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">{job.subject}</span>
                  {" - "}
                  {stripHtml(job.body)}
                </p>
                <StarIcon className="shrink-0 text-slate-300" width={16} height={16} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
