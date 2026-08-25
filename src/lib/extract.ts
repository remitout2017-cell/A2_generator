type MessageContent =
  | { type: "document"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "text"; text: string };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export async function extractDetails(
  files: File[],
  promptText: string,
  pastedText: string
): Promise<Record<string, string>> {
  const content: MessageContent[] = [];
  for (const f of files) {
    const b64 = await fileToBase64(f);
    if (f.type === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } });
    } else {
      content.push({ type: "image", source: { type: "base64", media_type: f.type || "image/jpeg", data: b64 } });
    }
  }
  if (pastedText && pastedText.trim()) {
    content.push({ type: "text", text: "Pasted document text:\n" + pastedText.trim() });
  }
  content.push({ type: "text", text: promptText });

  const fetchPromise = fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Request timed out after 45s.")), 45000);
  });

  let resp: Response;
  try {
    resp = await Promise.race([fetchPromise, timeoutPromise]);
  } catch (fetchErr) {
    const message = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    throw new Error(message.startsWith("Request timed out") ? message : "Network error: " + message);
  }

  const rawText = await resp.text();
  let respData: Record<string, unknown>;
  try {
    respData = JSON.parse(rawText);
  } catch {
    throw new Error("Server returned non-JSON (HTTP " + resp.status + "): " + rawText.slice(0, 300));
  }
  if (!resp.ok) {
    const raw = respData.raw ? " | model said: " + respData.raw : "";
    throw new Error("Extraction failed (HTTP " + resp.status + "): " + (respData.error || "unknown") + raw);
  }
  return respData as Record<string, string>;
}
