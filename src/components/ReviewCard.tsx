"use client";

import type { ReactNode } from "react";
import { APPLICANT_FIELDS, AMOUNT_FIELDS, BENEFICIARY_FIELDS, type Field, type FormData } from "@/lib/fields";
import { btn, btnGhost, btnSmall } from "@/lib/buttonStyles";
import { StatusMessage, type Status } from "@/components/StatusMessage";

const inputClass =
  "glass-input w-full rounded-lg text-cream px-2.5 py-2.25 font-mono text-[13px] focus:outline-none";

function FieldRow({ field, value, onChange }: { field: Field; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.08em] uppercase text-cream-dim/80 mb-1.25">{field.label}</label>
      {field.type === "select" ? (
        <select className={inputClass} value={value || field.default || ""} onChange={(e) => onChange(e.target.value)}>
          {field.options!.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input type="text" className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function FieldGrid({ fields, data, onChange }: { fields: Field[]; data: FormData; onChange: (key: string, v: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
      {fields.map((f) => (
        <FieldRow key={f.key} field={f} value={data[f.key] || ""} onChange={(v) => onChange(f.key, v)} />
      ))}
    </div>
  );
}

function SectionLabel({ children, divider = false }: { children: ReactNode; divider?: boolean }) {
  return (
    <div className={`text-[11px] tracking-[0.12em] uppercase text-orange font-semibold mb-3 ${divider ? "mt-7 pt-5 border-t border-line/40" : ""}`}>
      {children}
    </div>
  );
}

export function ReviewCard({
  data,
  onFieldChange,
  onBack,
  onGenerate,
  status,
}: {
  data: FormData;
  onFieldChange: (key: string, v: string) => void;
  onBack: () => void;
  onGenerate: () => void;
  status: Status;
}) {
  return (
    <div className="glass-card p-6 mb-5">
      <div className="text-[10px] tracking-[0.16em] uppercase text-orange font-semibold mb-1.5">Step 3 of 3</div>
      <h2 className="font-serif font-semibold text-[21px] m-0 mb-1.5 text-cream">Review &amp; edit before filling</h2>
      <p className="text-[13px] text-cream-dim leading-relaxed m-0 mb-6 max-w-[58ch]">
        Fields marked <span className="text-orange">●</span> are mandatory. Everything else is optional — leave blank if not
        applicable.
      </p>

      <SectionLabel>Applicant (sender)</SectionLabel>
      <FieldGrid fields={APPLICANT_FIELDS} data={data} onChange={onFieldChange} />

      <SectionLabel divider>Purpose &amp; amount</SectionLabel>
      <FieldGrid fields={AMOUNT_FIELDS} data={data} onChange={onFieldChange} />

      <SectionLabel divider>Beneficiary</SectionLabel>
      <FieldGrid fields={BENEFICIARY_FIELDS} data={data} onChange={onFieldChange} />

      <div className="flex gap-2.5 flex-wrap mt-6">
        <button type="button" className={`${btnGhost} ${btnSmall}`} onClick={onBack}>
          ← Back
        </button>
        <button type="button" className={btn} onClick={onGenerate}>
          Generate filled A2 PDF →
        </button>
      </div>
      <StatusMessage status={status} />
    </div>
  );
}
