import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Eye, FileImage, ImageDown, LoaderCircle, LockKeyhole, RefreshCw, ShieldAlert, ShieldCheck, Upload, X } from "lucide-react";
import "./PrivatePhotos.css";

type PrivateRole = "admin" | "coordinator" | "volunteer" | "sponsor" | string;
type ServerSession = { user: { id?: number; email?: string; role: PrivateRole } };
export type PrivatePhotoMetadata = {
  id: string;
  contentType?: string;
  content_type?: string;
  sizeBytes?: number;
  size_bytes?: number;
  reviewStatus?: "pending" | "approved" | "rejected";
  review_status?: "pending" | "approved" | "rejected";
  createdAt?: string;
  created_at?: string;
  uploadedAt?: string;
  uploaded_at?: string;
};

type EncodedCandidate = { id: string; name: string; blob: Blob; previewUrl: string; originalBytes: number; encodedBytes: number; width: number; height: number };
type PrivatePhotosProps = { onUpload?: (photo: PrivatePhotoMetadata) => void; onReview?: (photo: PrivatePhotoMetadata) => void };

const MAX_BYTES = 5 * 1024 * 1024;
const FIXTURE_PATH = "/demo-assets/poppy-calico-limp.png";

function csrf() {
  return document.cookie.split("; ").find((item) => item.startsWith("mews_csrf="))?.slice("mews_csrf=".length) ?? "";
}

function roleCanReview(role: PrivateRole | null) {
  return role === "admin" || role === "coordinator";
}

function metadataStatus(photo: PrivatePhotoMetadata) {
  return photo.reviewStatus ?? photo.review_status ?? "pending";
}

function metadataType(photo: PrivatePhotoMetadata) {
  return photo.contentType ?? photo.content_type ?? "image";
}

function metadataSize(photo: PrivatePhotoMetadata) {
  return photo.sizeBytes ?? photo.size_bytes ?? 0;
}

function metadataTime(photo: PrivatePhotoMetadata) {
  return photo.createdAt ?? photo.created_at ?? photo.uploadedAt ?? photo.uploaded_at ?? "Private upload";
}

function readableBytes(value: number) {
  if (!value) return "size unavailable";
  return value > 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(2)} MB` : `${Math.ceil(value / 1024)} KB`;
}

async function toJpeg(file: Blob, label: string): Promise<EncodedCandidate> {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, 2048 / longest);
  let width = Math.max(1, Math.round(bitmap.width * scale));
  let height = Math.max(1, Math.round(bitmap.height * scale));
  let canvas = document.createElement("canvas");
  let context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Your browser could not prepare a private image preview.");
  canvas.width = width;
  canvas.height = height;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  async function encode(quality: number) {
    return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Image preparation failed.")), "image/jpeg", quality));
  }

  let blob = await encode(.88);
  // A white-background JPEG re-encode removes embedded EXIF/metadata. If it is
  // still large, reduce dimensions once before rejecting it client-side.
  if (blob.size > MAX_BYTES) {
    width = Math.max(1, Math.round(width * .7));
    height = Math.max(1, Math.round(height * .7));
    canvas = document.createElement("canvas");
    context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Your browser could not resize this image.");
    canvas.width = width;
    canvas.height = height;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    // createImageBitmap consumed the source; redraw via a temporary blob URL.
    const originalUrl = URL.createObjectURL(file);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => { const value = new Image(); value.onload = () => resolve(value); value.onerror = () => reject(new Error("Image preparation failed.")); value.src = originalUrl; });
    context.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(originalUrl);
    blob = await encode(.76);
  }
  if (blob.size > MAX_BYTES) throw new Error("Prepared JPEG is still larger than 5 MB. Use a smaller fictional fixture image.");
  return { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, name: label.replace(/\.[a-z0-9]+$/i, "") + ".jpg", blob, previewUrl: URL.createObjectURL(blob), originalBytes: file.size, encodedBytes: blob.size, width, height };
}

async function requestJson(path: string, options: RequestInit = {}) {
  const response = await fetch(path, { ...options, credentials: "same-origin" });
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() as unknown : null;
  if (!response.ok) {
    const message = typeof body === "object" && body && "error" in body ? String((body as { error: unknown }).error) : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

/**
 * Private R2-photo UI. It deliberately has no demo-persona fallback: a server
 * session, CSRF cookie, R2 binding, and Worker routes are required.
 */
export function PrivatePhotos({ onUpload, onReview }: PrivatePhotosProps) {
  const [session, setSession] = useState<ServerSession | null>(null);
  const [photos, setPhotos] = useState<PrivatePhotoMetadata[]>([]);
  const [candidates, setCandidates] = useState<EncodedCandidate[]>([]);
  const [message, setMessage] = useState("Checking for a private server session…");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const objectUrls = useRef(new Set<string>());

  const canReview = roleCanReview(session?.user.role ?? null);
  const roleLabel = session?.user.role ? String(session.user.role) : "No server session";
  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const current = await requestJson("/api/auth/session") as ServerSession;
      setSession(current);
      const listed = await requestJson("/api/private/photos") as { photos?: PrivatePhotoMetadata[] } | PrivatePhotoMetadata[];
      const values = Array.isArray(listed) ? listed : listed.photos ?? [];
      setPhotos(values);
      setMessage(`Private photo metadata loaded for ${current.user.role}.`);
    } catch (error) {
      setSession(null);
      setPhotos([]);
      setMessage(error instanceof Error ? error.message : "Private photo workspace is unavailable.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => () => { objectUrls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);

  async function prepare(files: File[] | Blob[], source: string) {
    setBusy(true);
    try {
      const prepared = await Promise.all(files.slice(0, 4).map((file, index) => toJpeg(file, file instanceof File ? file.name : `${source}-${index + 1}.png`)));
      prepared.forEach((candidate) => objectUrls.current.add(candidate.previewUrl));
      setCandidates((current) => [...current, ...prepared]);
      setMessage(`${prepared.length} fictional image${prepared.length === 1 ? "" : "s"} prepared as metadata-stripped JPEG${prepared.length === 1 ? "" : "s"}. Review before upload.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Image preparation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadFixture() {
    setBusy(true);
    try {
      const response = await fetch(FIXTURE_PATH);
      if (!response.ok) throw new Error("The fictional demo image could not be loaded.");
      const fixture = await response.blob();
      const candidate = await toJpeg(fixture, "poppy-calico-limp.png");
      objectUrls.current.add(candidate.previewUrl);
      setCandidates((current) => [...current, candidate]);
      setMessage("Fictional demo cat image prepared as a metadata-stripped JPEG. It is not public and still requires private-server review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Fixture preparation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function chooseFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length) await prepare(files, "selected-fixture");
  }

  function removeCandidate(item: EncodedCandidate) {
    URL.revokeObjectURL(item.previewUrl);
    objectUrls.current.delete(item.previewUrl);
    setCandidates((current) => current.filter((candidate) => candidate.id !== item.id));
  }

  async function upload(item: EncodedCandidate) {
    if (!session) { setMessage("A private server session is required before uploading."); return; }
    if (!csrf()) { setMessage("The private CSRF cookie is missing. Sign in through the server workspace and retry."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/private/photos", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "image/jpeg", "X-CSRF-Token": csrf() }, body: item.blob });
      const contentType = response.headers.get("content-type") ?? "";
      const result: Partial<PrivatePhotoMetadata> & { error?: string; message?: string } = contentType.includes("application/json") ? await response.json() as Partial<PrivatePhotoMetadata> & { error?: string; message?: string } : {};
      if (!response.ok) throw new Error(result.error ?? `Upload failed (${response.status})`);
      if (typeof result.id === "string") onUpload?.(result as PrivatePhotoMetadata);
      removeCandidate(item);
      setMessage(result.message ?? "Private photo uploaded as pending review.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Private upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function review(photo: PrivatePhotoMetadata, decision: "approved" | "rejected") {
    if (!canReview) { setMessage("Only an authenticated admin or coordinator can approve or reject a private photo."); return; }
    if (!csrf()) { setMessage("The private CSRF cookie is missing. Sign in through the server workspace and retry."); return; }
    setBusy(true);
    try {
      const result = await requestJson(`/api/private/photos/${encodeURIComponent(photo.id)}/review`, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf() }, body: JSON.stringify({ decision }) }) as PrivatePhotoMetadata;
      onReview?.(result);
      setMessage(`Private photo ${decision}.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="private-photos" aria-labelledby="private-photos-title">
    <header className="private-photos-heading"><div><p className="private-photo-kicker">Private R2 evidence · human review</p><h2 id="private-photos-title">Photo privacy desk</h2><p>For fictional demo images only. Images are re-encoded in this browser before upload to remove embedded metadata; they remain private and are not published by this screen.</p></div><button type="button" className="private-refresh" onClick={() => void refresh()} disabled={busy}><RefreshCw className={busy ? "private-spin" : ""} size={15}/>Refresh</button></header>
    <div className="private-session"><LockKeyhole size={16}/><div><b>Team access: {roleLabel}</b><span>Uploads and previews stay private. An admin or coordinator reviews each image before it is approved.</span></div></div>
    <div className="private-photo-grid">
      <section className="private-upload" aria-labelledby="private-upload-title"><div className="private-section-title"><div><p className="private-photo-kicker">1 · Prepare locally</p><h3 id="private-upload-title">Use the fictional cat fixture</h3></div><ImageDown size={20}/></div><p>Use the provided hackathon fixture. Do not select photos of people, private property, volunteers, or real rescue cases.</p><div className="private-upload-actions"><button type="button" className="private-primary" onClick={() => void loadFixture()} disabled={busy}><FileImage size={15}/>Prepare demo photo</button><button type="button" className="private-secondary" onClick={() => input.current?.click()} disabled={busy}><Upload size={15}/>Choose fictional test image</button><input ref={input} className="private-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void chooseFiles(event)}/></div><p className="private-limit"><ShieldCheck size={14}/>JPEG output only · longest edge capped at 2048 px · less than 5 MB · client preview is temporary.</p>{candidates.length > 0 && <div className="candidate-list">{candidates.map((candidate) => <article className="candidate-card" key={candidate.id}><img src={candidate.previewUrl} alt="Prepared fictional cat fixture preview"/><div><b>{candidate.name}</b><small>{candidate.width} × {candidate.height} · {readableBytes(candidate.originalBytes)} → {readableBytes(candidate.encodedBytes)}</small><p>Re-encoded JPEG preview; original file bytes were not uploaded.</p><footer><button type="button" className="private-primary" onClick={() => void upload(candidate)} disabled={busy || !session}>{busy ? <LoaderCircle className="private-spin" size={14}/> : <Upload size={14}/>}Upload for private review</button><button type="button" className="candidate-remove" onClick={() => removeCandidate(candidate)} disabled={busy}><X size={14}/>Remove</button></footer></div></article>)}</div>}</section>
      <section className="private-review" aria-labelledby="private-review-title"><div className="private-section-title"><div><p className="private-photo-kicker">2 · Private review queue</p><h3 id="private-review-title">Metadata + protected preview</h3></div><Eye size={20}/></div><p>Previews are requested from the authenticated private endpoint. Pending evidence should not be shared or attached to public map records.</p>{!photos.length ? <div className="private-empty"><ShieldAlert size={21}/><b>No private metadata loaded</b><span>Sign in through the server workspace and refresh. The Vite-only demo server does not provide protected Worker storage.</span></div> : <div className="private-photo-list">{photos.map((photo) => { const status = metadataStatus(photo); return <article className={`stored-photo ${status}`} key={photo.id}><img src={`/api/private/photos/${encodeURIComponent(photo.id)}`} alt="Authenticated private evidence preview"/><div><header><span className={`photo-status ${status}`}>{status}</span><small>{metadataTime(photo)}</small></header><b>Private image {photo.id.slice(0, 8)}</b><p>{metadataType(photo)} · {readableBytes(metadataSize(photo))}</p>{status === "pending" && <footer>{canReview ? <><button type="button" className="approve-photo" disabled={busy} onClick={() => void review(photo, "approved")}><Check size={14}/>Approve</button><button type="button" className="reject-photo" disabled={busy} onClick={() => void review(photo, "rejected")}><X size={14}/>Reject</button></> : <small>Awaiting authenticated admin/coordinator decision.</small>}</footer>}</div></article>; })}</div>}</section>
    </div>
    <p className="private-message" role="status">{message}</p>
  </section>;
}
