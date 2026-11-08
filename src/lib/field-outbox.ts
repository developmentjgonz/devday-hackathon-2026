import { privateJson } from "./private-api";
const key = "mews-phone-outbox-v1";
export type QueuedFieldReport = { id: string; ownerId: number; payload: Record<string, unknown>; error?: string };
export function fieldOutbox(): QueuedFieldReport[] {
  try { const data = JSON.parse(localStorage.getItem(key) ?? "[]"); return Array.isArray(data) ? data.filter((item) => typeof item.id === "string" && Number.isInteger(item.ownerId) && item.payload?.synthetic === true).slice(0, 50) : []; } catch { return []; }
}
function save(items: QueuedFieldReport[]) { localStorage.setItem(key, JSON.stringify(items)); dispatchEvent(new Event("mews-outbox-changed")); }
export function queueFieldReport(ownerId: number, payload: Record<string, unknown>) {
  const items = fieldOutbox();
  if (!items.some((item) => item.id === payload.id)) save([...items, { id: String(payload.id), ownerId, payload }]);
}
let draining = false;
export async function deliverFieldOutbox() {
  if (draining || !navigator.onLine || !fieldOutbox().length) return;
  draining = true;
  try {
    const session = await privateJson("/api/auth/session");
    for (const item of fieldOutbox()) {
      if (item.ownerId !== session.user.id) continue;
      try {
        await privateJson("/api/private/field-report", item.payload);
        save(fieldOutbox().filter((value) => value.id !== item.id)); dispatchEvent(new Event("mews-data-changed"));
      } catch (error) { save(fieldOutbox().map((value) => value.id === item.id ? { ...value, error: error instanceof Error ? error.message : "Retry needed" } : value)); }
    }
  } catch { /* Keep reports until the original team account signs in again. */ }
  finally { draining = false; }
}
