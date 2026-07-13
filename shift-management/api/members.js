// Serverless API for TrainerHub / UnitC shared shift data.
// Backed by Vercel Edge Config: one item per member (key "member_<id>"),
// so saving one member's data never overwrites another member's data.

const MEMBER_IDS = ["hiko", "rinrin", "sakutan", "tsukky", "hartin", "yamasan", "sugii"];

// Not secrets: identifiers only. The actual credential (VERCEL_API_TOKEN) is
// kept as a project environment variable, never committed to source.
const EDGE_CONFIG_ID = "ecfg_xzv4rlyj221hboxu37y2x8bvvcfl";
const TEAM_ID = "team_YbHY5EM7Gvn35NhMzUak5AfB";

function envOrThrow(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

module.exports = async (req, res) => {
  try {
    const token = envOrThrow("VERCEL_API_TOKEN");
    const id = EDGE_CONFIG_ID;
    const qs = `?teamId=${encodeURIComponent(TEAM_ID)}`;

    if (req.method === "GET") {
      const r = await fetch(`https://api.vercel.com/v1/edge-config/${id}/items${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const w = await fetch(`https://api.vercel.com/v1/edge-config/${id}/items${qs}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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
