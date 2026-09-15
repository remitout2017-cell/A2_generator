"use client";

import { useState } from "react";
import { Stepper } from "@/components/Stepper";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UploadCard } from "@/components/UploadCard";
import { ReviewCard } from "@/components/ReviewCard";
import { DoneCard } from "@/components/DoneCard";
import { IDLE_STATUS, type Status } from "@/components/StatusMessage";
import { ALL_FIELDS, APPLICANT_FIELDS, BENEFICIARY_FIELDS, AMOUNT_FIELDS, defaultFormData, type FormData } from "@/lib/fields";
import { extractDetails } from "@/lib/extract";
import { fillA2Pdf } from "@/lib/fillPdf";

type Step = 1 | 2 | 3 | 4;

export default function Home() {
  const [step, setStep] = useState<Step>(1);

  const [senderFiles, setSenderFiles] = useState<File[]>([]);
  const [beneFiles, setBeneFiles] = useState<File[]>([]);
  const [pastedText1, setPastedText1] = useState("");
  const [pastedText2, setPastedText2] = useState("");

  const [data, setData] = useState<FormData>(defaultFormData());

  const [status1, setStatus1] = useState<Status>(IDLE_STATUS);
  const [status2, setStatus2] = useState<Status>(IDLE_STATUS);
  const [statusReview, setStatusReview] = useState<Status>(IDLE_STATUS);

  const [debug1, setDebug1] = useState("");
  const [debug2, setDebug2] = useState("");
  const [debugFinal, setDebugFinal] = useState("");

  const [extracting1, setExtracting1] = useState(false);
  const [extracting2, setExtracting2] = useState(false);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  function setField(key: string, value: string) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function handleExtract1() {
    setExtracting1(true);
    setStatus1({ kind: "loading", message: "Reading sender's ID…" });
    try {
      const schema = ["applicantName", "applicantAddress", "pan", "relationship"];
      const parsed = await extractDetails(
        senderFiles,
        `This is the ID document(s) — any of PAN card, Aadhaar card, or passport, possibly more than one for the same ` +
          `person — of a person sending money abroad for a student's education — either the student themselves or a ` +
          `parent/relative sending on the student's behalf. If both a PAN card and an Aadhaar card are provided, combine ` +
          `them: take the name and PAN from the PAN card, and use the Aadhaar card's printed address for "applicantAddress" ` +
          `since PAN cards don't carry an address. Aadhaar cards may be a folded multi-panel scan — the address block is ` +
          `usually near the top, next to "To" / enrollment number, and the photo/12-digit Aadhaar number panel is separate. ` +
          `Extract a flat JSON object with exactly these keys: ${JSON.stringify(schema)}. ` +
          `"applicantName" = full name on the ID. "pan" = PAN number if visible. "applicantAddress" = full postal address ` +
          `if visible on any of the documents (Aadhaar is the most likely source). ` +
          `CRITICAL for "applicantAddress": transcribe ONLY the exact text printed on the document — every line item ` +
          `(care-of, building/house name, street/cross/road, locality/nagar, city/VTC, post office, sub-district, ` +
          `district, state, PIN) must be copied character-for-character from what is actually visible. Do NOT invent, ` +
          `guess, autocomplete, or substitute a locality/street/PIN-area name that seems plausible for that PIN code — ` +
          `if a line is blurry or unreadable, omit it rather than filling in a plausible-sounding replacement. Every ` +
          `word you output for this field must be traceable to visible printed text in the image. ` +
          `"relationship" = "Student (Self)" if this document belongs to the student, or the relation to the student if it's ` +
          `a family member's document and that's stated/inferable (e.g. "Father", "Mother") — otherwise leave "". ` +
          `The image may be scanned or photographed sideways, upside-down (rotated 90°, 180°, or 270°), or crooked/tilted ` +
          `at an arbitrary angle (e.g. a handheld photo of the card at a slant, not aligned to the frame) — mentally ` +
          `rotate and straighten it before reading, and extract every field (including "pan") correctly regardless of ` +
          `its orientation or skew in the file. ` +
          `Use "" for anything not found. Respond with ONLY the raw JSON object, no markdown fences, no commentary.`,
        pastedText1
      );

      setData((d) => {
        const next = { ...d };
        APPLICANT_FIELDS.forEach((f) => {
          if (f.type) return;
          next[f.key] = (parsed[f.key] && String(parsed[f.key]).trim()) || next[f.key] || f.default || "";
        });
        const relField = APPLICANT_FIELDS.find((f) => f.key === "relationship");
        if (parsed.relationship && relField?.options?.includes(parsed.relationship)) {
          next.relationship = parsed.relationship;
        }
        return next;
      });

      const gotSomething = Object.values(parsed).some((v) => v && String(v).trim());
      setDebug1("Raw extraction result:\n" + JSON.stringify(parsed, null, 2));
      setStatus1({
        kind: gotSomething ? "ok" : "err",
        message: gotSomething
          ? "Extracted. You can edit these later in Review."
          : "Extraction ran but found nothing readable in this document — see raw result below. Try a clearer photo, or fill in manually.",
      });
      setStep(2);
    } catch (err) {
      setStatus1({
        kind: "err",
        message: "[STEP 1 — SENDER] Auto-extract failed: " + (err as Error).message + " — you can fill this in by hand in Review.",
      });
      setStep(2);
    } finally {
      setExtracting1(false);
    }
  }

  async function handleExtract2() {
    setExtracting2(true);
    setStatus2({ kind: "loading", message: "Reading beneficiary letter…" });
    try {
      const schema = [
        "beneficiaryName",
        "beneficiaryAddress",
        "bankName",
        "bankAddress",
        "accountIban",
        "swift",
        "routingCode",
        "universityName",
        "courseOfStudy",
        "applicationNumber",
        "studentNameOnLetter",
        "amount",
      ];
      const parsed = await extractDetails(
        beneFiles,
        `You are given one or more documents about a student's remittance abroad — any mix of a university admission ` +
          `letter, fee invoice, blocked account letter, GIC letter, or accommodation/rent payment letter. They may be in ` +
          `ANY language (German, English, or others, sometimes bilingual side by side) — read and understand all of them ` +
          `regardless of language, mentally translating as needed, and pull together the fullest possible picture by ` +
          `combining details found across ALL the documents (e.g. the admission letter may have the university/course/ ` +
          `application number while a separate invoice has the bank/IBAN/amount — use both). Look for local-language ` +
          `equivalents of: bank details (e.g. German "Bankverbindung"), account holder (e.g. "Kontoinhaber" — whose ` +
          `account this is; this is the beneficiaryName, which is often the university itself, not a separate person), ` +
          `IBAN, SWIFT/BIC code, payment amount (e.g. "Zahlungsbetrag"), reference (e.g. "Verwendungszweck"). ` +
          `Extract a flat JSON object with exactly these keys: ${JSON.stringify(schema)}. ` +
          `"beneficiaryName"/"beneficiaryAddress" = who/where the money is being sent to (the account holder — often the ` +
          `university, a government office, or a landlord — NOT the student). "bankName"/"bankAddress" = the receiving bank. ` +
          `"accountIban" and "swift" = the account/IBAN number and SWIFT/BIC code. "routingCode" = any BSB/sort/routing/transit code, ` +
          `or "N/A" if a document explicitly says so. "universityName"/"courseOfStudy" = if mentioned anywhere. "applicationNumber" = any ` +
          `application/reference/mandate number tied to the student. "studentNameOnLetter" = the student's name as it appears in the documents. ` +
          `"amount" = the specific amount to be paid if a number is given, with currency — if the amount varies per student and no ` +
          `figure is stated anywhere, leave "". ` +
          `Fill in every key you can find evidence for anywhere across the documents provided; only use "" for a key that ` +
          `truly has no supporting information in any of them. Any page/image may be scanned or photographed sideways, ` +
          `upside-down (rotated 90°, 180°, or 270°), or crooked/tilted at an arbitrary angle (e.g. a handheld photo of the ` +
          `document at a slant) — mentally rotate and straighten it before reading, and extract the text correctly ` +
          `regardless of its orientation or skew in the file. Respond with ONLY the raw JSON object, no markdown fences, no commentary.`,
        pastedText2
      );

      const amountField = AMOUNT_FIELDS.find((f) => f.key === "amount")!;
      setData((d) => {
        const next = { ...d };
        [...BENEFICIARY_FIELDS, amountField].forEach((f) => {
          next[f.key] = (parsed[f.key] && String(parsed[f.key]).trim()) || next[f.key] || f.default || "";
        });
        return next;
      });

      const gotSomething = Object.values(parsed).some((v) => v && String(v).trim());
      setDebug2("Raw extraction result:\n" + JSON.stringify(parsed, null, 2));
      setStatus2({
        kind: gotSomething ? "ok" : "err",
        message: gotSomething
          ? "Extracted. Review everything below before generating."
          : "Extraction ran but found nothing readable in this document — see raw result below. Try a clearer photo, or fill in manually.",
      });
      setStep(3);
    } catch (err) {
      setStatus2({
        kind: "err",
        message: "[STEP 2 — BENEFICIARY] Auto-extract failed: " + (err as Error).message + " — you can fill this in by hand in Review.",
      });
      setStep(3);
    } finally {
      setExtracting2(false);
    }
  }

  async function handleGenerate() {
    const missing = ALL_FIELDS.filter((f) => f.required && !data[f.key]).map((f) => f.label.replace("● ", ""));
    if (missing.length) {
      setStatusReview({ kind: "err", message: "Please fill in: " + missing.join(", ") });
      return;
    }

    setStatusReview({ kind: "loading", message: "Filling PDF…" });
    const dbg: string[] = [];
    try {
      const filledBytes = await fillA2Pdf(data, dbg);
      const blob = new Blob([new Uint8Array(filledBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      dbg.push("Output blob URL created");
      setDebugFinal(dbg.join("\n"));
      setStatusReview({ kind: "ok", message: "Done." });
      setStep(4);
    } catch (err) {
      dbg.push("ERROR: " + (err as Error).message);
      setDebugFinal(dbg.join("\n"));
      setStatusReview({ kind: "err", message: "[STEP 3 — GENERATE PDF] Failed: " + (err as Error).message });
      setStep(4);
    }
  }

  function handleRestart() {
    setSenderFiles([]);
    setBeneFiles([]);
    setPastedText1("");
    setPastedText2("");
    setData(defaultFormData());
    setStatus1(IDLE_STATUS);
    setStatus2(IDLE_STATUS);
    setStatusReview(IDLE_STATUS);
    setDebug1("");
    setDebug2("");
    setDebugFinal("");
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setStep(1);
  }

  const stepMap: Record<Step, 1 | 2 | 3> = { 1: 1, 2: 2, 3: 3, 4: 3 };

  return (
    <div className="max-w-225 mx-auto px-5 pt-7 pb-20">
      <div className="flex justify-between items-end border-b-2 border-dashed border-white/15 pb-4 mb-5.5">
        <div>
          <div className="font-serif font-semibold text-2xl text-cream">RemitOut · A2 Filler</div>
          <div className="text-[11px] tracking-[0.12em] uppercase text-cream-dim">FEMA / LRS Form A2 Auto-Fill</div>
        </div>
        <div className="flex items-center gap-3.5">
          <div className="text-xs text-cream-dim text-right tracking-[0.08em]">
            FORM A2/LRS
            <br />
            INSTAREM
          </div>
          <ThemeToggle />
        </div>
      </div>

      <Stepper activeStep={stepMap[step]} />

      {step === 1 && (
        <UploadCard
          stepTitle="1. Who's sending the money?"
          subtitle="Upload the sender's PAN card and Aadhaar card (or passport, if handy). The sender could be the student, or a parent/relative remitting on their behalf — either is fine."
          files={senderFiles}
          onFilesChange={setSenderFiles}
          pastedText={pastedText1}
          onPastedTextChange={setPastedText1}
          pastedPlaceholder="Paste the sender's name, address, PAN etc. here as plain text — copy straight off the PAN card or ID"
          onExtract={handleExtract1}
          extractLabel="Extract sender details →"
          extractDisabled={extracting1 || (senderFiles.length === 0 && !pastedText1.trim())}
          onSkip={() => setStep(2)}
          status={status1}
          debugText={debug1}
        />
      )}

      {step === 2 && (
        <UploadCard
          stepTitle="2. Where's the money going?"
          subtitle="Upload whichever letter has the receiving account details — university invoice, blocked account letter, GIC letter, accommodation/rent letter, anything with a bank name, IBAN & SWIFT."
          files={beneFiles}
          onFilesChange={setBeneFiles}
          pastedText={pastedText2}
          onPastedTextChange={setPastedText2}
          pastedPlaceholder="Paste the beneficiary/bank details here as plain text — copy straight off the letter (works with German or bilingual text too)"
          onBack={() => setStep(1)}
          onExtract={handleExtract2}
          extractLabel="Extract beneficiary details →"
          extractDisabled={extracting2 || (beneFiles.length === 0 && !pastedText2.trim())}
          onSkip={() => setStep(3)}
          status={status2}
          debugText={debug2}
        />
      )}

      {step === 3 && (
        <ReviewCard data={data} onFieldChange={setField} onBack={() => setStep(2)} onGenerate={handleGenerate} status={statusReview} />
      )}

      {step === 4 && (
        <DoneCard
          pdfUrl={pdfUrl}
          applicantName={data.applicantName}
          onBack={() => setStep(3)}
          onRestart={handleRestart}
          debugText={debugFinal}
        />
      )}

      {/* <div className="text-[11px] text-cream-dim leading-relaxed mt-2.5">
        <b className="text-cream">Note:</b> fills the informational fields of the Instarem A2/LRS form, plus every &quot;Signature of
        Applicant&quot; / &quot;I, ____ declare&quot; line — those get the applicant&apos;s <b className="text-cream">typed name only</b>,
        no scanned signature. LRS transaction-history tables and the bank&apos;s certification section (page 5) are left for the branch
        to complete.
      </div> */}

      <footer className="text-center text-[10px] text-cream-dim mt-7.5 tracking-[0.06em]">
        REMITOUT SERVICE PVT LTD · MUMBAI · FORM A2 AUTO-FILL TOOL
        <br />
        HOSTED BUILD v12 — Next.js
      </footer>
    </div>
  );
  
}
