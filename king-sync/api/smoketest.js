// Throwaway diagnostic endpoint — confirms the connected Blob store works
// (write + read back) via a plain GET, since POST can't be tested through
// the tools available in this session. Delete once sync.js is confirmed.
import { put, head } from "@vercel/blob";

export default async function handler(req, res) {
  try {
    const testPath = "sync/_smoketest.json";
    const testData = { hello: "world", ts: Date.now() };
    const putResult = await put(testPath, JSON.stringify(testData), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      storeId: process.env.BLOB_STORE_ID,
    });
    const info = await head(testPath, { storeId: process.env.BLOB_STORE_ID });
    const upstream = await fetch(info.url);
    const readBack = await upstream.json();
    res.status(200).json({
      ok: true,
      wrote: testData,
      readBack,
      putResult,
      headInfo: { url: info.url, uploadedAt: info.uploadedAt, size: info.size, contentType: info.contentType },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String((e && e.message) || e), name: e && e.name, stack: e && e.stack });
  }
}
