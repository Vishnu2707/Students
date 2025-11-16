export default async function handler(req, res) {
  const url = req.query.url;

  if (!url) {
    res.status(400).send("Missing url parameter");
    return;
  }

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const text = await upstream.text();

    // Detect if feed returns HTML 404 or error instead of XML
    if (text.startsWith("<!DOCTYPE html") || text.includes("404")) {
      return res.status(502).send("Feed is not a valid RSS/ATOM: " + url);
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Type", "application/xml");

    res.status(200).send(text);

  } catch (err) {
    res.status(500).send("Proxy error: " + err.message);
  }
}
