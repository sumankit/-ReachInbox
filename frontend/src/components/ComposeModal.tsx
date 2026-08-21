"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useSession } from "next-auth/react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Input, Label, Textarea } from "./ui/Input";
import { ErrorBanner } from "./ui/States";
import { createCampaign, ApiError } from "@/lib/api";

function countEmailsInText(text: string): number {
  const matches = text.match(/[^\s,;]+@[^\s,;]+\.[^\s,;]+/g);
  return matches ? new Set(matches.map((m) => m.toLowerCase())).size : 0;
}

export function ComposeModal({ open, onClose, onScheduled }: { open: boolean; onClose: () => void; onScheduled: () => void }) {
  const { data: session } = useSession();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [startTime, setStartTime] = useState("");
  const [delayMs, setDelayMs] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [file, setFile] = useState<File | null>(null);
  const [leadCount, setLeadCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setSubject("");
    setBody("");
    setStartTime("");
    setDelayMs(2000);
    setHourlyLimit(200);
    setFile(null);
    setLeadCount(0);
    setError(null);
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (!selected) {
      setLeadCount(0);
      return;
    }
    const text = await selected.text();
    setLeadCount(countEmailsInText(text));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session?.backendToken) return;
    if (!file) {
      setError("Upload a CSV/text file of email leads.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("body", body);
      formData.append("startTime", new Date(startTime).toISOString());
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

  return (
    <Modal open={open} onClose={onClose} title="Compose new email">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="body">Body</Label>
          <Textarea id="body" required rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="leadsFile">Leads (CSV or TXT)</Label>
          <Input id="leadsFile" type="file" accept=".csv,.txt" required onChange={handleFileChange} />
          {file && <p className="mt-1 text-xs text-slate-500">{leadCount} email address(es) detected</p>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="startTime">Start time</Label>
            <Input
              id="startTime"
              type="datetime-local"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="delayMs">Delay (ms)</Label>
            <Input
              id="delayMs"
              type="number"
              min={0}
              required
              value={delayMs}
              onChange={(e) => setDelayMs(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="hourlyLimit">Hourly limit</Label>
            <Input
              id="hourlyLimit"
              type="number"
              min={1}
              required
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
            />
          </div>
        </div>

        {error && <ErrorBanner message={error} />}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Scheduling…" : "Schedule"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
