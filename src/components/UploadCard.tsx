"use client";

import { FileDropZone } from "@/components/FileDropZone";
import { StatusMessage, type Status } from "@/components/StatusMessage";
import { DebugPanel } from "@/components/DebugPanel";
import { btn, btnGhost, btnSmall, textareaClass } from "@/lib/buttonStyles";

export function UploadCard({
  stepTitle,
  subtitle,
  files,
  onFilesChange,
  pastedText,
  onPastedTextChange,
  pastedPlaceholder,
  onBack,
  onExtract,
  extractLabel,
  extractDisabled,
  onSkip,
  status,
  debugText,
}: {
  stepTitle: string;
  subtitle: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
  pastedText: string;
  onPastedTextChange: (v: string) => void;
  pastedPlaceholder: string;
  onBack?: () => void;
  onExtract: () => void;
  extractLabel: string;
  extractDisabled: boolean;
  onSkip: () => void;
  status: Status;
  debugText: string;
}) {
  const match = stepTitle.match(/^(\d+)\.\s*(.*)$/);
  const stepNum = match?.[1];
  const title = match?.[2] ?? stepTitle;

  return (
    <div className="glass-card p-6 mb-5">
      {stepNum && (
        <div className="text-[10px] tracking-[0.16em] uppercase text-orange font-semibold mb-1.5">Step {stepNum} of 3</div>
      )}
      <h2 className="font-serif font-semibold text-[21px] m-0 mb-1.5 text-cream">{title}</h2>
      <p className="text-[13px] text-cream-dim leading-relaxed m-0 mb-5 max-w-[52ch]">{subtitle}</p>

      <FileDropZone files={files} onChange={onFilesChange} inputId={`fileInput-${stepTitle}`} />

      <div className="flex items-center gap-3 mt-6 mb-4">
        <div className="h-px flex-1 bg-line/50" />
        <span className="text-[10px] tracking-[0.14em] uppercase text-cream-dim shrink-0">or paste details instead</span>
        <div className="h-px flex-1 bg-line/50" />
      </div>
      <textarea
        rows={stepTitle.startsWith("2") ? 6 : 4}
        placeholder={pastedPlaceholder}
        className={textareaClass}
        value={pastedText}
        onChange={(e) => onPastedTextChange(e.target.value)}
      />

      <div className="flex gap-2.5 flex-wrap mt-5">
        {onBack && (
          <button type="button" className={`${btnGhost} ${btnSmall}`} onClick={onBack}>
            ← Back
          </button>
        )}
        <button type="button" className={btn} disabled={extractDisabled} onClick={onExtract}>
          {extractLabel}
        </button>
        <button type="button" className={`${btnGhost} ${btnSmall}`} onClick={onSkip}>
          Skip — fill in manually →
        </button>
      </div>
      <StatusMessage status={status} />
      <DebugPanel text={debugText} />
    </div>
  );
}
