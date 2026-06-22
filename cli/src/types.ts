export interface WebhookRecord {
  id: string;
  token: string;
  method: string;
  headers: string;
  body: string;
  received_at: number;
}