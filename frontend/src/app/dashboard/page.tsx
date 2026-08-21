"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { EmailTable } from "@/components/EmailTable";
import { ComposeModal } from "@/components/ComposeModal";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/States";
import { fetchEmails, ApiError } from "@/lib/api";
import { EmailJob } from "@/types";

type Tab = "scheduled" | "sent";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("scheduled");
  const [jobs, setJobs] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  const load = useCallback(async () => {
    if (!session?.backendToken) return;
    setLoading(true);
    setError(null);
    try {
      const { jobs } = await fetchEmails(session.backendToken, tab);
      setJobs(jobs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load emails.");
    } finally {
      setLoading(false);
    }
  }, [session?.backendToken, tab]);

  useEffect(() => {
    load();
  }, [load]);

  if (status !== "authenticated") return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {(["scheduled", "sent"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                  tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t === "scheduled" ? "Scheduled Emails" : "Sent Emails"}
              </button>
            ))}
          </div>
          <Button onClick={() => setComposeOpen(true)}>+ Compose New Email</Button>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} />
          </div>
        )}

        <EmailTable jobs={jobs} loading={loading} mode={tab} />
      </main>

      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} onScheduled={load} />
    </div>
  );
}
