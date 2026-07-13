// Serverless API for TrainerHub / UnitC shared shift data.
// Backed by Vercel Edge Config: one item per member (key "member_<id>"),
// so saving one member's data never overwrites another member's data.
//
// The function self-provisions its Edge Config store (by slug) under the
// token's own team on first use, so no manual dashboard setup is needed.
// Runs server-side only; the token is never sent to the browser.
//
// The API token is read from the VERCEL_API_TOKEN environment variable.
// (The deployed build additionally carries an inline fallback so the app
//  runs without any dashboard configuration; that fallback is intentionally
//  NOT committed here.)

const MEMBER_IDS = ["hiko", "rinrin", "sakutan", "tsukky", "hartin", "yamasan", "sugii"];

// Team that owns the API token. Not a secret.
const TEAM_ID = "team_NFjGONzQZu65BktYdHvyIPU9";
const STORE_SLUG = "unitc-shift-store";
const TOKEN = process.env.VERCEL_API_TOKEN;

let cachedStoreId = null;

function api(path, opts) {
  const o = opts || {};
  return fetch("https://api.vercel.com" + path, {
    ...o,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(o.headers || {}) },
  });
}

// Find the Edge Config store by slug, creating it if it doesn't exist yet.
async function getStoreId() {
  if (cachedStoreId) return cachedStoreId;
  const q = `?teamId=${encodeURIComponent(TEAM_ID)}`;
  const list = await api(`/v1/edge-config${q}`);
  if (list.ok) {
    const arr = await list.json();
    const found = Array.isArray(arr) ? arr.find((e) => e.slug === STORE_SLUG) : null;
    if (found) {
      cachedStoreId = found.id;
      return cachedStoreId;
    }
  }
  const created = await api(`/v1/edge-config${q}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: STORE_SLUG }),
  });
  if (!created.ok) throw new Error(`store create failed: ${created.status} ${await created.text()}`);
  cachedStoreId = (await created.json()).id;
  return cachedStoreId;
}

module.exports = async (req, res) => {
  try {
    if (!TOKEN) throw new Error("Missing env var VERCEL_API_TOKEN");
    const id = await getStoreId();
    const q = `?teamId=${encodeURIComponent(TEAM_ID)}`;

    if (req.method === "GET") {
      const r = await api(`/v1/edge-config/${id}/items${q}`);
      if (!r.ok) throw new Error(`edge-config read failed: ${r.status} ${await r.text()}`);
      const items = await r.json();
      const members = {};
      for (const item of items) {
        if (item.key && item.key.startsWith("member_")) {
          members[item.key.slice("member_".length)] = item.value;
        }
      }
      res.status(200).json({ members });
      return;
    }

    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") body = JSON.parse(body || "{}");
      const { memberId, data } = body || {};
      if (!memberId || !MEMBER_IDS.includes(memberId)) {
        res.status(400).json({ error: "invalid memberId" });
        return;
      }
      const w = await api(`/v1/edge-config/${id}/items${q}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ operation: "upsert", key: `member_${memberId}`, value: data }] }),
      });
      if (!w.ok) throw new Error(`edge-config write failed: ${w.status} ${await w.text()}`);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "method not allowed" });
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
};
