import type { CreateCampaignResponse, EmailJob, Sender } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

class ApiError extends Error {}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body?.error ? JSON.stringify(body.error) : `Request failed: ${res.status}`);
  }
  return res.json();
}

export function fetchEmails(token: string, status: "scheduled" | "sent") {
  return request<{ jobs: EmailJob[] }>(`/api/emails?status=${status}`, token);
}

export function fetchSenders(token: string) {
  return request<{ senders: Sender[] }>(`/api/senders`, token);
}

export function createCampaign(token: string, formData: FormData) {
  return request<CreateCampaignResponse>(`/api/campaigns`, token, {
    method: "POST",
    body: formData,
  });
}

export { ApiError };
