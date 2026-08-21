"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "./ui/Button";
import { ErrorBanner } from "./ui/States";
import { createCampaign, fetchSenders, ApiError } from "@/lib/api";
import {
  ArrowLeftIcon,
  BoldIcon,
  ChevronDownIcon,
  ClockIcon,
  ItalicIcon,
  ListIcon,
  RedoIcon,
  UnderlineIcon,
  UndoIcon,
  UploadIcon,
} from "./ui/Icons";

function parseEmailsFromText(text: string): string[] {
  const matches = text.match(/[^\s,;]+@[^\s,;]+\.[^\s,;]+/g);
  return matches ? Array.from(new Set(matches.map((m) => m.toLowerCase()))) : [];
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function ComposeModal({
  open,
  onClose,
  onScheduled,
}: {
  open: boolean;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [delayMs, setDelayMs] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [senderCount, setSenderCount] = useState<number | null>(null);

  const [startTime, setStartTime] = useState<Date>(() => new Date(Date.now() + 5 * 60 * 1000));
  const [schedulePopoverOpen, setSchedulePopoverOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && session?.backendToken) {
      fetchSenders(session.backendToken)
        .then((r) => setSenderCount(r.senders.length))
        .catch(() => setSenderCount(null));
    }
  }, [open, session?.backendToken]);

  function reset() {
    setSubject("");
    setBody("");
    setRecipients([]);
    setFile(null);
    setDelayMs(2000);
    setHourlyLimit(200);
    setStartTime(new Date(Date.now() + 5 * 60 * 1000));
    setError(null);
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (!selected) {
      setRecipients([]);
      return;
    }
    const text = await selected.text();
    setRecipients(parseEmailsFromText(text));
  }

  function applyQuickSchedule(minutesFromNow: number) {
    setStartTime(new Date(Date.now() + minutesFromNow * 60 * 1000));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session?.backendToken) return;
    if (!file) {
      setError("Upload a list of email leads first.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("body", body);
      formData.append("startTime", startTime.toISOString());
      formData.append("delayMs", String(delayMs));
      formData.append("hourlyLimit", String(hourlyLimit));
      formData.append("leadsFile", file);

      await createCampaign(session.backendToken, formData);
      reset();
      onScheduled();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to schedule campaign.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const visibleChips = recipients.slice(0, 3);
  const overflow = recipients.length - visibleChips.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl px-8 py-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-3 text-slate-800 hover:text-slate-600"
          >
            <ArrowLeftIcon width={20} height={20} />
            <span className="text-2xl font-semibold">Compose New Email</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => setSchedulePopoverOpen((v) => !v)}
                className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Schedule send time"
              >
                <ClockIcon width={20} height={20} />
              </button>

              {schedulePopoverOpen && (
                <div className="absolute right-0 top-full z-10 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  <p className="mb-3 text-sm font-semibold text-slate-800">Send Later</p>
                  <input
                    type="datetime-local"
                    value={toLocalInputValue(startTime)}
                    onChange={(e) => setStartTime(new Date(e.target.value))}
                    className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <div className="space-y-1">
                    {[
                      { label: "In 5 minutes", minutes: 5 },
                      { label: "In 1 hour", minutes: 60 },
                      { label: "Tomorrow, 10:00 AM", minutes: null },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          if (opt.minutes != null) applyQuickSchedule(opt.minutes);
                          else {
                            const d = new Date();
                            d.setDate(d.getDate() + 1);
                            d.setHours(10, 0, 0, 0);
                            setStartTime(d);
                          }
                        }}
                        className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => setSchedulePopoverOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setSchedulePopoverOpen(false)}>
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" variant="outline" disabled={submitting}>
              {submitting ? "Scheduling…" : "Schedule"}
            </Button>
          </div>
        </div>

        <div className="mt-8 space-y-5">
          <Row label="From">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
              {senderCount ? `Round-robin across ${senderCount} sender(s)` : "Loading senders…"}
              <ChevronDownIcon width={14} height={14} className="text-slate-400" />
            </span>
          </Row>

          <Row label="To">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {visibleChips.map((email) => (
                <span
                  key={email}
                  className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs text-brand-700"
                >
                  {email}
                </span>
              ))}
              {overflow > 0 && (
                <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs text-brand-700">
                  +{overflow}
                </span>
              )}
              {recipients.length === 0 && (
                <span className="text-sm text-slate-400">recipient@example.com</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="ml-auto flex shrink-0 items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              <UploadIcon width={16} height={16} />
              Upload List
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
          </Row>
          {file && (
            <p className="-mt-3 pl-16 text-xs text-slate-400">
              {recipients.length} email address(es) detected in {file.name}
            </p>
          )}

          <Row label="Subject">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              required
              className="w-full border-b border-transparent bg-transparent py-1 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none"
            />
          </Row>

          <div className="flex items-center gap-8 pl-16">
            <label className="flex items-center gap-3 text-sm text-slate-600">
              Delay between 2 emails
              <input
                type="number"
                min={0}
                value={delayMs}
                onChange={(e) => setDelayMs(Number(e.target.value))}
                className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-600">
              Hourly Limit
              <input
                type="number"
                min={1}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </label>
          </div>

          <div className="overflow-hidden rounded-2xl bg-slate-50">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type Your Reply..."
              required
              rows={10}
              className="w-full resize-none bg-transparent px-5 pt-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
            <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 mx-4 mb-4 text-slate-400 shadow-sm">
              <UndoIcon width={16} height={16} />
              <RedoIcon width={16} height={16} />
              <span className="h-4 w-px bg-slate-200" />
              <BoldIcon width={16} height={16} />
              <ItalicIcon width={16} height={16} />
              <UnderlineIcon width={16} height={16} />
              <span className="h-4 w-px bg-slate-200" />
              <ListIcon width={16} height={16} />
            </div>
          </div>

          {error && <ErrorBanner message={error} />}
        </div>
      </form>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-12 shrink-0 text-sm text-slate-500">{label}</span>
      {children}
    </div>
  );
}
