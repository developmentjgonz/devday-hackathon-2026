export function privateHeaders() {
  return { "Content-Type": "application/json", "X-CSRF-Token": document.cookie.split("; ").find((value) => value.startsWith("mews_csrf="))?.slice(10) ?? "" };
}

export async function privateJson(path: string, body?: unknown) {
  const response = await fetch(path, body === undefined ? undefined : { method: "POST", headers: privateHeaders(), body: JSON.stringify(body) });
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("The backend is unavailable. Start the full demo server.");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data;
}
