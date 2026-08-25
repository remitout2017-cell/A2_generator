import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { ALL_FIELDS, type FormData } from "./fields";

// Shrinks font size (down to minSize) so `text` fits within maxWidth at the given font.
function fitFontSize(font: PDFFont, text: string, maxWidth: number, maxSize: number, minSize = 6): number {
  let size = maxSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.5;
  }
  return size;
}

const PURPOSE_CHECKBOX: Record<string, string> = {
  "Leisure Travel": "Check Box11",
  Emigration: "Check Box12",
  Employment: "Check Box13",
  "Higher Studies": "Check Box15",
  "Medical Treatment": "Check Box16",
  Others: "Check Box18",
};

const SIG_FIELDS = ["I", "remittedpurchased is for the purpose indicated as per Item 4 on page 2", "Text23"];

const SIG_POSITIONS: { page: number; x: number; y: number }[] = [
  { page: 0, x: 395, y: 67 }, // page 1, bottom
  { page: 1, x: 427, y: 107 }, // page 2, bottom
  { page: 3, x: 436, y: 540 }, // page 4, mid-page
];

// The "Date:" label immediately to the left of each "Signature of Applicant:" spot above.
// Page 1's has a real form field ("Date"); pages 2 and 4 have no field there, just blank
// space after the printed label, so the date is drawn directly like the signature name.
const DATE_FIELD_NAME = "Date";
const DATE_DRAW_POSITIONS: { page: number; x: number; y: number }[] = [
  { page: 1, x: 104, y: 107 }, // page 2, bottom
  { page: 3, x: 104, y: 540 }, // page 4, mid-page
];

function formatToday(): string {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export async function fillA2Pdf(values: FormData, dbg: string[]): Promise<Uint8Array> {
  const res = await fetch("/A2_template.pdf");
  if (!res.ok) throw new Error("Could not load PDF template (HTTP " + res.status + ")");
  const bytes = new Uint8Array(await res.arrayBuffer());
  dbg.push("Loaded template bytes: " + bytes.length);

  const pdfDoc = await PDFDocument.load(bytes);
  dbg.push("PDF pages: " + pdfDoc.getPageCount());
  const form = pdfDoc.getForm();
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  dbg.push("Form fields detected: " + form.getFields().length);

  ALL_FIELDS.forEach((f) => {
    if (!f.pdf) return;
    f.pdf.forEach((pdfName) => {
      try {
        const tf = form.getTextField(pdfName);
        const text = values[f.key] || "";
        tf.setText(text);
        // Uniform 8pt across the form so filled values look consistent rather than
        // each field auto-sizing to its own box, but shrunk further when the value is
        // too long for its box (e.g. a long name/address) so it never overflows.
        // "Name of University" is a physically narrow box, so it always auto-sizes.
        if (pdfName === "Name of University") {
          tf.setFontSize(0);
        } else {
          const widget = tf.acroField.getWidgets()[0];
          const boxWidth = widget ? widget.getRectangle().width : 0;
          tf.setFontSize(boxWidth ? fitFontSize(bodyFont, text, boxWidth - 4, 8) : 8);
        }
        tf.updateAppearances(bodyFont);
      } catch (e) {
        dbg.push("FAILED to set '" + pdfName + "': " + (e as Error).message);
      }
    });
  });

  // relationship label -> concise value on the PDF
  if (values.relationship) {
    const relText = values.relationship === "Student (Self)" ? "Self" : values.relationship;
    try {
      const rf = form.getTextField("n Relationship");
      rf.setText(relText);
      rf.setFontSize(8);
      rf.updateAppearances(bodyFont);
    } catch {
      // field may not exist on this template revision
    }
  }

  // purpose checkbox
  const purpose = values.purposeSelect || "Higher Studies";
  const cbName = PURPOSE_CHECKBOX[purpose];
  if (cbName) {
    try {
      form.getCheckBox(cbName).check();
    } catch {
      // ignore
    }
  }

  // purpose code table row
  try {
    const setSmall = (nm: string, val: string, size: number) => {
      const f = form.getTextField(nm);
      f.setText(val);
      f.setFontSize(size);
      f.updateAppearances(bodyFont);
    };
    setSmall("SL NoRow1", "1", 8);
    if (purpose === "Higher Studies") {
      setSmall("Purpose CodeYES", "S0305", 8);
      setSmall("DescriptionYES", "Travel for education (incl. fees, hostel expenses)", 7);
    }
  } catch {
    // ignore
  }

  // application number / student name -> Additional details line
  const extras: string[] = [];
  if (values.applicationNumber) extras.push("Application No: " + values.applicationNumber);
  if (values.studentNameOnLetter) extras.push("Student: " + values.studentNameOnLetter);
  if (extras.length) {
    try {
      const af = form.getTextField("Additional details");
      af.setText(extras.join("  |  "));
      af.setFontSize(8);
      af.updateAppearances(bodyFont);
    } catch {
      // ignore
    }
  }

  // signature lines: typed name only, no scanned signature — italic to read as a signature.
  // Exactly 3 genuine spots: the Sec.5 declaration, the Sec.7 declaration, and the FEMA
  // declaration on page 3.
  const italicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const sigName = values.applicantName || "";
  SIG_FIELDS.forEach((name) => {
    try {
      const f = form.getTextField(name);
      f.setText(sigName);
      const widget = f.acroField.getWidgets()[0];
      const boxWidth = widget ? widget.getRectangle().width : 0;
      const size = boxWidth ? fitFontSize(italicFont, sigName, boxWidth - 4, 10) : 10;
      f.setFontSize(size);
      f.updateAppearances(italicFont);
    } catch {
      // ignore
    }
  });

  // "Signature of Applicant:" lines — pages 1, 2 and 4 have no form field there, so the
  // sender's name is drawn directly onto the page next to each label, in italic ink-blue.
  try {
    const pages = pdfDoc.getPages();
    if (sigName) {
      SIG_POSITIONS.forEach((pos) => {
        try {
          const page = pages[pos.page];
          const availWidth = page.getWidth() - pos.x - 20; // leave a right margin
          const size = fitFontSize(italicFont, sigName, availWidth, 10);
          page.drawText(sigName, {
            x: pos.x,
            y: pos.y,
            size,
            font: italicFont,
            color: rgb(0.1, 0.1, 0.45),
          });
        } catch (e) {
          dbg.push("sig draw failed on page " + (pos.page + 1) + ": " + (e as Error).message);
        }
      });
    }
  } catch (e) {
    dbg.push("signature drawing failed: " + (e as Error).message);
  }

  // Every "Date:" spot next to a "Signature of Applicant:" line gets today's date,
  // stamped at generation time (e.g. "29 August 2026").
  const todayStr = formatToday();
  try {
    const df = form.getTextField(DATE_FIELD_NAME);
    df.setText(todayStr);
    const widget = df.acroField.getWidgets()[0];
    const boxWidth = widget ? widget.getRectangle().width : 0;
    df.setFontSize(boxWidth ? fitFontSize(bodyFont, todayStr, boxWidth - 4, 8) : 8);
    df.updateAppearances(bodyFont);
  } catch (e) {
    dbg.push("date field fill failed: " + (e as Error).message);
  }
  try {
    const pages = pdfDoc.getPages();
    DATE_DRAW_POSITIONS.forEach((pos) => {
      try {
        pages[pos.page].drawText(todayStr, {
          x: pos.x,
          y: pos.y,
          size: 8,
          font: bodyFont,
          color: rgb(0, 0, 0),
        });
      } catch (e) {
        dbg.push("date draw failed on page " + (pos.page + 1) + ": " + (e as Error).message);
      }
    });
  } catch (e) {
    dbg.push("date drawing failed: " + (e as Error).message);
  }

  const filledBytes = await pdfDoc.save();
  dbg.push("Saved PDF bytes: " + filledBytes.length);
  return filledBytes;
}
