import { getStore } from "@netlify/blobs";

const KEY_RE = /^[a-zA-Z0-9-]{8,80}$/;
const MAX_BODY_BYTES = 300 * 1024;

export default async (req) => {
  const url = new URL(req.url);
  const store = getStore("sync");

  if (req.method === "GET") {
    const key = url.searchParams.get("key");
    if (typeof key !== "string" || !KEY_RE.test(key)) {
      return Response.json({ ok: false, error: "invalid key" }, { status: 400 });
    }
    const raw = await store.get(key);
    if (raw === null) {
      return Response.json({ ok: true, found: false });
    }
    try {
      const data = JSON.parse(raw);
      return Response.json({ ok: true, found: true, data });
    } catch {
      return Response.json({ ok: true, found: false });
    }
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ ok: false, error: "invalid body" }, { status: 400 });
    }
    if (!body || typeof body.key !== "string" || !KEY_RE.test(body.key) || typeof body.data !== "object" || !body.data) {
      return Response.json({ ok: false, error: "invalid body" }, { status: 400 });
    }
    const json = JSON.stringify(body.data);
    if (new TextEncoder().encode(json).length > MAX_BODY_BYTES) {
      return Response.json({ ok: false, error: "payload too large" }, { status: 413 });
    }
    await store.set(body.key, json);
    return Response.json({ ok: true, updatedAt: new Date().toISOString() });
  }

  return Response.json({ ok: false, error: "method not allowed" }, { status: 405 });
};

export const config = {
  path: "/api/sync",
};
