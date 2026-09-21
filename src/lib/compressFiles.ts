// Shrinks oversized uploads in the browser so the multipart request stays under
// Vercel's 4.5MB body limit. Small files pass through untouched. Images are
// downscaled + re-encoded as JPEG; PDFs are rendered page-by-page to JPEG images
// (the model reads images just as well, and scanned PDFs are images anyway).

const SKIP_BELOW_BYTES = 700 * 1024; // leave small files alone
const TOTAL_BUDGET_BYTES = 3.5 * 1024 * 1024; // stay well under 4.5MB incl. overhead
const MAX_PDF_PAGES = 6;

// Progressively smaller settings until the total fits.
const LEVELS = [
  { maxDim: 1800, quality: 0.8 },
  { maxDim: 1500, quality: 0.7 },
  { maxDim: 1200, quality: 0.6 },
  { maxDim: 1000, quality: 0.5 },
];

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), "image/jpeg", quality)
  );
}

function drawScaled(source: CanvasImageSource, w: number, h: number, maxDim: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // JPEG has no alpha
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function imageToJpeg(file: File, maxDim: number, quality: number): Promise<File> {
  const bmp = await createImageBitmap(file); // honours EXIF orientation in modern browsers
  const canvas = drawScaled(bmp, bmp.width, bmp.height, maxDim);
  bmp.close();
  const blob = await canvasToJpeg(canvas, quality);
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

async function pdfToJpegs(file: File, maxDim: number, quality: number): Promise<File[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const base = file.name.replace(/\.[^.]+$/, "");
  const out: File[] = [];
  const pages = Math.min(doc.numPages, MAX_PDF_PAGES);
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const vp1 = page.getViewport({ scale: 1 });
    const scale = Math.min(4, maxDim / Math.max(vp1.width, vp1.height));
    const vp = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
    const blob = await canvasToJpeg(canvas, quality);
    out.push(new File([blob], `${base}-p${i}.jpg`, { type: "image/jpeg" }));
  }
  await doc.cleanup();
  return out;
}

export async function compressFiles(files: File[]): Promise<File[]> {
  const total = files.reduce((n, f) => n + f.size, 0);
  if (total <= TOTAL_BUDGET_BYTES) return files;

  let result = files;
  for (const { maxDim, quality } of LEVELS) {
    const next: File[] = [];
    for (const f of files) {
      const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
      const isImage = f.type.startsWith("image/");
      if (f.size < SKIP_BELOW_BYTES || (!isPdf && !isImage)) next.push(f);
      else if (isPdf) next.push(...(await pdfToJpegs(f, maxDim, quality)));
      else next.push(await imageToJpeg(f, maxDim, quality));
    }
    result = next;
    if (result.reduce((n, f) => n + f.size, 0) <= TOTAL_BUDGET_BYTES) break;
  }
  return result;
}
