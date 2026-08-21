export type EmailJobStatus = "SCHEDULED" | "PROCESSING" | "SENT" | "FAILED";

export interface EmailJob {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailJobStatus;
  error: string | null;
  sender: { email: string; name: string };
}

export interface Sender {
  id: string;
  name: string;
  email: string;
}

export interface ScheduleFormValues {
  subject: string;
  body: string;
  startTime: string; // datetime-local input value
  delayMs: number;
  hourlyLimit: number;
  leadsFile: File | null;
}

export interface CreateCampaignResponse {
  campaignId: string;
  recipientCount: number;
  senderCount: number;
}
