// Serverless function: receives document content from the A2 filler page,
// calls Anthropic with the API key held server-side, returns the extracted JSON.
// The API key is NEVER sent to the browser.

export default async function handler(req, res) {
  // CORS — allow the page to call this
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not set on the server" });
  }

  try {
    const { content } = req.body || {};
    if (!content || !Array.isArray(content)) {
      return res.status(400).json({ error: "Expected { content: [...] }" });
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content }]
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: (data && data.error && data.error.message) || ("HTTP " + upstream.status)
      });
    }

    // Pull the text out, strip fences, salvage JSON if wrapped in prose
    const text = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n");

    let clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    let parsed = null;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      const first = clean.indexOf("{"), last = clean.lastIndexOf("}");
      if (first !== -1 && last > first) {
        try { parsed = JSON.parse(clean.slice(first, last + 1)); } catch (e2) {}
      }
    }

    if (!parsed) {
      return res.status(502).json({ error: "Model did not return valid JSON", raw: clean.slice(0, 400) });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
