export default async function handler(req, res) {
  const url = req.query.url;

  try {
    const response = await fetch(url);
    const text = await response.text();

    // Allow browser access
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/xml");

    res.status(200).send(text);
  } catch (err) {
    res.status(500).send("Proxy fetch failed: " + err.message);
  }
}
