export async function extractDetails(
  files: File[],
  promptText: string,
  pastedText: string
): Promise<Record<string, string>> {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f, f.name));
  if (pastedText && pastedText.trim()) {
    fd.append("pastedText", pastedText.trim());
  }
  fd.append("prompt", promptText);

  const fetchPromise = fetch("/api/extract", {
    method: "POST",
    body: fd,
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
