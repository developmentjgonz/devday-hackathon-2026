const LIMIT = 5 * 1024 * 1024;

function imageType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

/** Caller must authenticate, check role, and validate CSRF before invoking. */
export async function uploadPrivatePhoto(request, env, actorId) {
  if (!env.PHOTOS || !env.DB) return Response.json({ error: "Private photo storage is not configured" }, { status: 503 });
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > LIMIT) return Response.json({ error: "Image exceeds 5 MB" }, { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "Image is required" }, { status: 400 });
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > LIMIT) { await reader.cancel(); return Response.json({ error: "Image exceeds 5 MB" }, { status: 413 }); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  if (!bytes.length || bytes.length > LIMIT) return Response.json({ error: "Image must be between 1 byte and 5 MB" }, { status: 413 });
  const contentType = imageType(bytes);
  if (!contentType || request.headers.get("content-type")?.split(";")[0] !== contentType) return Response.json({ error: "Use a valid JPEG, PNG, or WebP image" }, { status: 415 });
  const id = crypto.randomUUID();
  const key = `private/${id}`;
  await env.PHOTOS.put(key, bytes, { httpMetadata: { contentType } });
  try {
    await env.DB.prepare("INSERT INTO private_photos (id, object_key, content_type, size_bytes, uploaded_by) VALUES (?, ?, ?, ?, ?)").bind(id, key, contentType, bytes.length, actorId).run();
  } catch (error) {
    await env.PHOTOS.delete(key);
    throw error;
  }
  return Response.json({ id, reviewStatus: "pending", message: "Private image queued for review. Images may retain metadata and must not be shared until reviewed." }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

/** Caller must enforce the admin/coordinator review role and CSRF. */
export async function reviewPrivatePhoto(env, photoId, decision, actorId) {
  if (!env.DB || !["approved", "rejected"].includes(decision)) return Response.json({ error: "Invalid review" }, { status: 400 });
  const result = await env.DB.prepare("UPDATE private_photos SET review_status = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ? AND review_status = 'pending'").bind(decision, actorId, photoId).run();
  if (!result.meta?.changes) return Response.json({ error: "Photo not found or already reviewed" }, { status: 404 });
  return Response.json({ id: photoId, reviewStatus: decision }, { headers: { "Cache-Control": "no-store" } });
}

/** Caller must authenticate and authorize the requesting role. */
export async function readPrivatePhoto(env, photoId) {
  if (!env.DB || !env.PHOTOS) return Response.json({ error: "Private photo storage is not configured" }, { status: 503 });
  const photo = await env.DB.prepare("SELECT object_key, content_type FROM private_photos WHERE id = ?").bind(photoId).first();
  if (!photo) return Response.json({ error: "Not found" }, { status: 404 });
  const object = await env.PHOTOS.get(photo.object_key);
  if (!object) return Response.json({ error: "Not found" }, { status: 404 });
  return new Response(object.body, { headers: { "Content-Type": photo.content_type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" } });
}
