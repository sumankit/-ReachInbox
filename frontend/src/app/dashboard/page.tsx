"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { EmailTable } from "@/components/EmailTable";
import { ComposeModal } from "@/components/ComposeModal";
import { ErrorBanner } from "@/components/ui/States";
import { fetchEmails, ApiError } from "@/lib/api";
import { EmailJob } from "@/types";

type Tab = "scheduled" | "sent";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("scheduled");
  const [jobs, setJobs] = useState<EmailJob[]>([]);
  const [counts, setCounts] = useState<{ scheduled: number; sent: number }>({ scheduled: 0, sent: 0 });
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
      setCounts((prev) => ({ ...prev, [tab]: jobs.length }));
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
    <div className="flex min-h-screen bg-white">
      <Sidebar
        tab={tab}
        onTabChange={setTab}
        onCompose={() => setComposeOpen(true)}
        scheduledCount={counts.scheduled}
        sentCount={counts.sent}
      />

      <main className="flex-1 px-8 py-6">
        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} />
          </div>
        )}

        <EmailTable jobs={jobs} loading={loading} mode={tab} onRefresh={load} />
      </main>

      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} onScheduled={load} />
    </div>
  );
}
