export type FieldGroup = "applicant" | "amount" | "beneficiary";

export interface Field {
  key: string;
  label: string;
  group: FieldGroup;
  type?: "select";
  options?: string[];
  default?: string;
  required?: boolean;
  pdf?: string[];
}

export const APPLICANT_FIELDS: Field[] = [
  { key: "applicantName", label: "● Full name", group: "applicant", pdf: ["a Name"], required: true },
  { key: "applicantAddress", label: "Address", group: "applicant", pdf: ["b Address"] },
  { key: "pan", label: "PAN", group: "applicant", pdf: ["c PAN No of traveller", "PAN No Remitter"] },
  {
    key: "relationship",
    label: "Relationship to student",
    group: "applicant",
    type: "select",
    options: ["Student (Self)", "Father", "Mother", "Son", "Daughter", "Spouse", "Sibling", "Other relative"],
    default: "Student (Self)",
    pdf: ["n Relationship"],
  },
];

export const AMOUNT_FIELDS: Field[] = [
  {
    key: "amount",
    label: "● Amount (with currency)",
    group: "amount",
    pdf: ["Currency Name  Amount TT", "Fund Transferred specify currency  Amount"],
    required: true,
  },
  { key: "benOur", label: "BEN / OUR charges", group: "amount", type: "select", options: ["OUR", "BEN", "SHA"], default: "OUR", pdf: ["BENOUR"] },
  {
    key: "purposeSelect",
    label: "Purpose of travel",
    group: "amount",
    type: "select",
    options: ["Higher Studies", "Leisure Travel", "Emigration", "Employment", "Medical Treatment", "Others"],
    default: "Higher Studies",
  },
];

export const BENEFICIARY_FIELDS: Field[] = [
  { key: "beneficiaryName", label: "● Beneficiary name", group: "beneficiary", pdf: ["Beneficiarys Name"], required: true },
  { key: "beneficiaryAddress", label: "Beneficiary address", group: "beneficiary", pdf: ["Beneficiarys address"] },
  { key: "bankName", label: "● Bank name", group: "beneficiary", pdf: ["Name of the Bank"], required: true },
  { key: "bankAddress", label: "Bank address", group: "beneficiary", pdf: ["Address of Beneficiarys Bank"] },
  { key: "accountIban", label: "● Account / IBAN no.", group: "beneficiary", pdf: ["AccountIBAN No"], required: true },
  { key: "swift", label: "● SWIFT code", group: "beneficiary", pdf: ["SWIFT or Sort"], required: true },
  { key: "routingCode", label: "Routing / BSB / sort code", group: "beneficiary", pdf: ["RoutingTransit Code", "BSB Code"] },
  { key: "universityName", label: "● University name", group: "beneficiary", pdf: ["Name of University"], required: true },
  { key: "courseOfStudy", label: "Course of study", group: "beneficiary", pdf: ["Course of StudyEducation"] },
  { key: "applicationNumber", label: "Application number", group: "beneficiary" },
  { key: "studentNameOnLetter", label: "Student name (on letter)", group: "beneficiary" },
];

export const ALL_FIELDS: Field[] = [...APPLICANT_FIELDS, ...AMOUNT_FIELDS, ...BENEFICIARY_FIELDS];

export type FormData = Record<string, string>;

export function defaultFormData(): FormData {
  const data: FormData = {};
  ALL_FIELDS.forEach((f) => {
    data[f.key] = f.default || "";
  });
  return data;
}
