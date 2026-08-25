# A2 Form Filler — RemitOut

Next.js (App Router, TypeScript, Tailwind CSS) rewrite of the FEMA/LRS Form A2 auto-fill tool. Upload a sender's ID and a
beneficiary letter, extract the details via Google Gemini, review/edit, then generate a filled A2 PDF client-side with `pdf-lib`.

## Getting started

```bash
cp .env.example .env.local   # add your GEMINI_API_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Structure

- `src/app/page.tsx` — the 4-step UI (sender → beneficiary → review → download)
- `src/app/api/extract/route.ts` — server route holding `GEMINI_API_KEY`, proxies to Gemini's `generateContent` API
- `src/lib/fields.ts` — form field definitions shared between the review UI and the PDF filler
- `src/lib/fillPdf.ts` — fills `public/A2_template.pdf` with `pdf-lib`
- `src/lib/extract.ts` — client helper that posts files/text to `/api/extract`
- `src/components/` — Stepper, upload/review/done cards, file drop zone

## Deploying

Deploys like any Next.js app (e.g. Vercel). Set `GEMINI_API_KEY` as an environment variable in your hosting
provider — the key is only ever read server-side in `src/app/api/extract/route.ts`.

The original static-HTML version is kept under `legacy/` for reference.
# A2_generator
# a2
# A2_generator
