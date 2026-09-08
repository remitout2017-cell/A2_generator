import { NextRequest, NextResponse } from "next/server";

// Route handler: receives document content from the A2 filler page, calls
// Google Gemini with the API key held server-side, returns the extracted JSON.
// The API key is NEVER sent to the browser.
//
// Files arrive as multipart/form-data (raw bytes) rather than base64-in-JSON —
// base64 inflates payload size by ~33%, which was enough to push a couple of
// scanned ID PDFs (e.g. a PAN card + Aadhaar card) over Vercel's 4.5MB request
// body limit and fail with FUNCTION_PAYLOAD_TOO_LARGE before the model ever
// saw them. Base64 is only applied here, server-side, for the outbound call
// to Gemini, which isn't subject to that inbound limit.

export const maxDuration = 60;

const GEMINI_MODEL = "gemini-2.5-flash";

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not set on the server" }, { status: 500 });
  }

  try {
    const form = await req.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    const pastedText = (form.get("pastedText") as string) || "";
    const prompt = (form.get("prompt") as string) || "";

    const parts: GeminiPart[] = [];
    for (const f of files) {
      const buf = await f.arrayBuffer();
      const data = Buffer.from(buf).toString("base64");
      const mimeType = f.type || (f.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
      parts.push({ inlineData: { mimeType, data } });
    }
    if (pastedText.trim()) {
      parts.push({ text: "Pasted document text:\n" + pastedText.trim() });
    }
    parts.push({ text: prompt });

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { maxOutputTokens: 4000, responseMimeType: "application/json" },
        }),
      }
    );

    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "HTTP " + upstream.status },
        { status: upstream.status }
      );
    }

    const text = ((data.candidates?.[0]?.content?.parts || []) as { text?: string }[])
      .map((p) => p.text || "")
      .join("\n");

    const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const first = clean.indexOf("{");
      const last = clean.lastIndexOf("}");
      if (first !== -1 && last > first) {
        try {
          parsed = JSON.parse(clean.slice(first, last + 1));
        } catch {
          // fall through
        }
      }
    }

    if (!parsed) {
      return NextResponse.json({ error: "Model did not return valid JSON", raw: clean.slice(0, 400) }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: "Server error: " + (err as Error).message }, { status: 500 });
  }
}
