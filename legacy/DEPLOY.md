# A2 Form Filler — Deployment Guide

This gets you a **public URL you can share on WhatsApp**, with auto-extraction working.

## What's in this folder

```
index.html          the tool (calls /api/extract instead of Anthropic directly)
api/extract.js      serverless function — holds your API key, calls Anthropic
vercel.json         config
```

**Why a backend is needed:** the extraction step calls Anthropic's API, which requires
a secret key. If that key sat in the HTML, anyone opening the page could read it and
run up your bill. The backend keeps it server-side — the browser never sees it.

---

## Step 1 — Get an Anthropic API key

1. Go to **console.anthropic.com**
2. Sign up / log in (this is separate from your Claude subscription)
3. **Settings → API Keys → Create Key**
4. Copy the key (starts with `sk-ant-...`) — you only see it once
5. Add some credit under **Billing** (extraction costs roughly a fraction of a
   rupee per document; ₹500 will cover a lot of students)

## Step 2 — Deploy to Vercel

1. Go to **vercel.com** and sign up (free tier is fine)
2. Install the CLI: `npm install -g vercel`
3. In this folder, run:
   ```bash
   vercel
   ```
   Follow the prompts (accept the defaults; it's a static site + one function)

**Or without the CLI:** push this folder to a GitHub repo, then in Vercel click
"Add New → Project", import that repo, and deploy.

## Step 3 — Add your API key

In the Vercel dashboard for this project:

**Settings → Environment Variables → Add**

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your `sk-ant-...` key |

Then **redeploy** (Deployments → ⋯ → Redeploy) so the function picks it up.

## Step 4 — Test and share

You'll get a URL like `https://a2-form-filler.vercel.app`.

Open it and check:
- Upload a PAN card → **Extract sender details** → fields populate
- Upload a fee letter → **Extract beneficiary details** → bank details populate
- **Generate** → **Download** → PDF is filled correctly

Then share that URL on WhatsApp.

---

## Important notes

**Anyone with the link can use it**, and every extraction costs you money. Since
you'll be sending it to your own students, that's usually fine — but don't post it
publicly. If you want it locked down, options are:
- A simple shared password on the page
- Vercel's built-in password protection (paid plan)
- Restricting by domain

**Costs:** each extraction is one API call with a document image. Rough order of
magnitude: a few paise to a rupee per call depending on document size. Watch the
first week's usage in the Anthropic console to get a real number.

**Custom domain:** in Vercel, Settings → Domains, you can point something like
`a2.remitout.com` at it instead of the vercel.app URL.

## If extraction fails after deploying

The error message on the page now includes the HTTP status:
- **HTTP 500, "ANTHROPIC_API_KEY not set"** → env var missing, or you didn't redeploy
- **HTTP 401** → key is wrong or revoked
- **HTTP 429** → rate limited, or out of credit
- **HTTP 400** → usually a document too large; try a smaller/compressed file
