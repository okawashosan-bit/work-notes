// DRAFT — not yet verified against a real Vercel Blob store.
// Exact @vercel/blob call shapes (put/head options, access level, error
// shape on a missing key) need to be confirmed with a real smoke test
// once a Blob store exists and is connected to this project. Treat the
// put()/head() usage below as a best-effort sketch, not a tested contract.

import { put, head } from "@vercel/blob";

const KEY_RE = /^[a-zA-Z0-9-]{8,80}$/;
const MAX_BODY_BYTES = 300 * 1024;

function blobPath(key) {
  return `sync/${key}.json`;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const key = req.query.key;
    if (typeof key !== "string" || !KEY_RE.test(key)) {
      res.status(400).json({ ok: false, error: "invalid key" });
      return;
    }
    try {
      const info = await head(blobPath(key));
      const upstream = await fetch(info.url);
      const data = await upstream.json();
      res.status(200).json({ ok: true, found: true, updatedAt: info.uploadedAt, data });
    } catch (e) {
      res.status(200).json({ ok: true, found: false });
    }
    return;
  }

  if (req.method === "POST") {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = null;
      }
    }
    if (!body || typeof body.key !== "string" || !KEY_RE.test(body.key) || typeof body.data !== "object" || !body.data) {
      res.status(400).json({ ok: false, error: "invalid body" });
      return;
    }
    const json = JSON.stringify(body.data);
    if (Buffer.byteLength(json, "utf8") > MAX_BODY_BYTES) {
      res.status(413).json({ ok: false, error: "payload too large" });
      return;
    }
    await put(blobPath(body.key), json, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    res.status(200).json({ ok: true, updatedAt: new Date().toISOString() });
    return;
  }

  res.status(405).json({ ok: false, error: "method not allowed" });
}
