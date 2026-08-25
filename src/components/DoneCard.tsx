"use client";

import { btn, btnGhost } from "@/lib/buttonStyles";
import { DebugPanel } from "@/components/DebugPanel";

export function DoneCard({
  pdfUrl,
  applicantName,
  onBack,
  onRestart,
  debugText,
}: {
  pdfUrl: string | null;
  applicantName: string;
  onBack: () => void;
  onRestart: () => void;
  debugText: string;
}) {
  const nameStub = (applicantName || "student").replace(/[^a-z0-9]+/gi, "_");

  return (
    <div className="glass-card p-6 mb-5">
      <div className="flex items-center gap-2 text-[10px] tracking-[0.16em] uppercase text-ok font-semibold mb-1.5">
        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-ok text-white text-[9px]">✓</span>
        Complete
      </div>
      <h2 className="font-serif font-semibold text-[21px] m-0 mb-1.5 text-cream">A2 form ready</h2>
      <p className="text-[13px] text-cream-dim leading-relaxed m-0 mb-5 max-w-[52ch]">
        Every field is still editable inside the PDF — open it, do a last check, then sign.
      </p>
      <div className="flex gap-2.5 flex-wrap">
        <a href={pdfUrl ?? undefined} download={`A2_Form_${nameStub}.pdf`} className={`${btn} inline-block no-underline`}>
          ⬇ Download filled A2 PDF
        </a>
        <button type="button" className={btnGhost} onClick={onBack}>
          ← Back to review
        </button>
        <button type="button" className={btnGhost} onClick={onRestart}>
          Start another
        </button>
      </div>

      <div className="mt-6">
        <div className="text-[11px] tracking-[0.1em] uppercase text-cream-dim mb-2">
          Preview (works on desktop browsers; on mobile, use Download and open with any PDF app)
        </div>
        {pdfUrl && (
          <iframe
            src={pdfUrl}
            className="w-full h-[420px] border border-line rounded-xl bg-white"
            title="Filled A2 PDF preview"
          />
        )}
      </div>
      <DebugPanel text={debugText} className="mt-4! max-h-[220px]" />
    </div>
  );
}
