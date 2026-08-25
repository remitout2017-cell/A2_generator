import { NextRequest, NextResponse } from "next/server";

// Route handler: receives document content from the A2 filler page, calls
// Google Gemini with the API key held server-side, returns the extracted JSON.
// The API key is NEVER sent to the browser.

export const maxDuration = 60;

const GEMINI_MODEL = "gemini-2.5-flash";

interface ContentBlock {
  type: "document" | "image" | "text";
  text?: string;
  source?: { type: "base64"; media_type: string; data: string };
}

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not set on the server" }, { status: 500 });
  }

  try {
    const body = await req.json().catch(() => null);
    const content = body?.content as ContentBlock[] | undefined;
    if (!content || !Array.isArray(content)) {
      return NextResponse.json({ error: "Expected { content: [...] }" }, { status: 400 });
    }

    const parts: GeminiPart[] = content.map((block) => {
      if (block.type === "text") return { text: block.text || "" };
      return { inlineData: { mimeType: block.source!.media_type, data: block.source!.data } };
    });

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
