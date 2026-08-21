import { EmailJob } from "@/types";
import { EmptyState, Spinner, StatusBadge } from "./ui/States";

export function EmailTable({
  jobs,
  loading,
  mode,
}: {
  jobs: EmailJob[];
  loading: boolean;
  mode: "scheduled" | "sent";
}) {
  if (loading) return <Spinner />;

  if (jobs.length === 0) {
    return (
      <EmptyState
        title={mode === "scheduled" ? "No scheduled emails yet" : "No sent emails yet"}
        subtitle={mode === "scheduled" ? "Compose a new email to schedule your first send." : "Sent emails will show up here."}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Subject</th>
            <th className="px-4 py-3">{mode === "scheduled" ? "Scheduled time" : "Sent time"}</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <tr key={job.id}>
              <td className="px-4 py-3 text-slate-800">{job.recipient}</td>
              <td className="px-4 py-3 text-slate-600">{job.subject}</td>
              <td className="px-4 py-3 text-slate-600">
                {new Date(mode === "scheduled" ? job.scheduledAt : job.sentAt ?? job.scheduledAt).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={job.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
