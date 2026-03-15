// ── Document type ─────────────────────────────────────────────────────────────

export type Document = {
  _id: string;
  type: string;
  label?: string;
  url: string;
  filename: string;
  uploadedAt: string;
};

// ── User type ─────────────────────────────────────────────────────────────────

export type User = {
  _id: string;
  companyName: string;
  email: string;
  role: "manufacturer" | "logistics";
  contactNumber?: string;
  panNo?: string;
  companyLocation?: string;
  companyDescription?: string;
  companyWebsite?: string;
  companyLogo?: string;
  documents: Document[];
  isVerified: boolean;
  isAccountVerified: boolean;
  submittedForVerification: boolean;
  rejectionReason?: string;
};

export const FILTER_TABS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Verified", value: "verified" },
  { label: "Rejected", value: "rejected" },
];

export const ROLE_TABS: { label: string; value: string }[] = [
  { label: "All Roles", value: "" },
  { label: "Manufacturer", value: "manufacturer" },
  { label: "Logistics", value: "logistics" },
];

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  company_registration: "Company Registration",
  tax_clearance: "Tax Clearance",
  pan_certificate: "PAN Certificate",
  vat_certificate: "VAT Certificate",
  other: "Other",
};
