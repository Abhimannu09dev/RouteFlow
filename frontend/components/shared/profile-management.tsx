"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Hash,
  Camera,
  Upload,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Save,
  Clock,
  XCircle,
  FileText,
  Trash2,
  Plus,
} from "lucide-react";

type Document = {
  _id: string;
  type: string;
  label: string;
  url: string;
  filename: string;
  uploadedAt: string;
};

type UserProfile = {
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

type FormState = {
  companyName: string;
  contactNumber: string;
  panNo: string;
  companyLocation: string;
  companyDescription: string;
  companyWebsite: string;
};

type PendingDocument = {
  id: string; // local temp id
  file: File;
  type: string;
  label: string;
  preview: string; // object URL for preview
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const DOCUMENT_TYPES = [
  { value: "company_registration", label: "Company Registration" },
  { value: "tax_clearance", label: "Tax Clearance" },
  { value: "pan_certificate", label: "PAN Certificate" },
  { value: "vat_certificate", label: "VAT Certificate" },
  { value: "other", label: "Other" },
];

async function apiFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || data.message || "Request failed");
  return data;
}

function VerificationBanner({ profile }: { profile: UserProfile }) {
  if (profile.isAccountVerified)
    return (
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border mb-5 bg-green-50 border-green-200">
        <ShieldCheck size={18} className="text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-700">
            Account Verified
          </p>
          <p className="text-xs text-green-600 mt-0.5">
            Your company has been verified. You have full access to the
            platform.
          </p>
        </div>
      </div>
    );

  if (profile.submittedForVerification)
    return (
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border mb-5 bg-blue-50 border-blue-200">
        <Clock size={18} className="text-blue-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-700">Under Review</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Your profile has been submitted. The admin will review and verify
            your account shortly.
          </p>
        </div>
      </div>
    );

  if (profile.rejectionReason)
    return (
      <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl border mb-5 bg-red-50 border-red-200">
        <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-600">
            Verification Rejected
          </p>
          <p className="text-xs text-red-500 mt-0.5">
            <span className="font-medium">Reason:</span>{" "}
            {profile.rejectionReason}
          </p>
          <p className="text-xs text-red-400 mt-1">
            Update your profile based on the feedback above, then resubmit.
          </p>
        </div>
      </div>
    );

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border mb-5 bg-amber-50 border-amber-200">
      <ShieldAlert size={18} className="text-amber-600 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-amber-700">
          Pending Verification
        </p>
        <p className="text-xs text-amber-600 mt-0.5">
          Complete your profile and upload your company documents, then click
          &quot;Submit for Verification&quot; for admin review.
        </p>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon size={17} className="text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#252C32]">{title}</p>
        <p className="text-xs text-[#838383]">{subtitle}</p>
      </div>
    </div>
  );
}

function FieldLabel({
  label,
  required,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <label className="text-xs font-medium text-[#5B6871] mb-1.5 block">
      {label}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

export default function ProfileManagement() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<FormState>({
    companyName: "",
    contactNumber: "",
    panNo: "",
    companyLocation: "",
    companyDescription: "",
    companyWebsite: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Pending documents — selected by user, not yet uploaded
  const [pendingDocs, setPendingDocs] = useState<PendingDocument[]>([]);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await apiFetch("/profile");
        const u: UserProfile = data.user;
        setProfile(u);
        setForm({
          companyName: u.companyName || "",
          contactNumber: u.contactNumber || "",
          panNo: u.panNo || "",
          companyLocation: u.companyLocation || "",
          companyDescription: u.companyDescription || "",
          companyWebsite: u.companyWebsite || "",
        });
        if (u.companyLogo) setLogoPreview(u.companyLogo);
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleDocSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const totalAfter =
      (profile?.documents.length || 0) + pendingDocs.length + files.length;
    if (totalAfter > 5) {
      toast.error("Maximum 5 documents allowed");
      return;
    }

    const newPending: PendingDocument[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      type: "company_registration",
      label: "",
      preview: URL.createObjectURL(file),
    }));

    setPendingDocs((prev) => [...prev, ...newPending]);
    e.target.value = "";
  }

  function updatePendingDoc(
    id: string,
    field: "type" | "label",
    value: string,
  ) {
    setPendingDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
    );
  }

  function removePendingDoc(id: string) {
    setPendingDocs((prev) => {
      const doc = prev.find((d) => d.id === id);
      if (doc) URL.revokeObjectURL(doc.preview);
      return prev.filter((d) => d.id !== id);
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }

    setIsSaving(true);
    try {
      // Use FormData because multer expects multipart/form-data
      const formData = new FormData();
      formData.append("companyName", form.companyName);
      formData.append("contactNumber", form.contactNumber);
      formData.append("panNo", form.panNo);
      formData.append("companyLocation", form.companyLocation);
      formData.append("companyDescription", form.companyDescription);
      formData.append("companyWebsite", form.companyWebsite);

      if (logoFile) {
        formData.append("companyLogo", logoFile);
      }

      const data = await fetch(`${API_BASE_URL}/profile`, {
        method: "PUT",
        credentials: "include",
        body: formData,
      });

      const result = await data.json();
      if (!data.ok) throw new Error(result.message || "Failed to save");

      setProfile(result.user);
      setLogoFile(null); // clear pending logo after save
      toast.success("Profile saved successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUploadDocuments() {
    if (pendingDocs.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();

      const types: string[] = [];
      const labels: string[] = [];

      pendingDocs.forEach((doc) => {
        formData.append("documents", doc.file);
        types.push(doc.type);
        labels.push(doc.label || "");
      });

      formData.append("documentTypes", JSON.stringify(types));
      formData.append("documentLabels", JSON.stringify(labels));

      const response = await fetch(`${API_BASE_URL}/profile/documents`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Upload failed");

      // Update profile documents list
      setProfile((prev) =>
        prev ? { ...prev, documents: result.documents } : prev,
      );

      // Clear pending docs and revoke object URLs
      pendingDocs.forEach((d) => URL.revokeObjectURL(d.preview));
      setPendingDocs([]);

      toast.success(`${pendingDocs.length} document(s) uploaded successfully!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload documents");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteDocument(documentId: string) {
    setDeletingId(documentId);
    try {
      const data = await apiFetch(`/profile/documents/${documentId}`, {
        method: "DELETE",
      });
      setProfile((prev) =>
        prev ? { ...prev, documents: data.documents } : prev,
      );
      toast.success("Document deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmitForVerification() {
    setIsSubmitting(true);
    try {
      await apiFetch("/profile/submit-verification", { method: "POST" });
      toast.success("Profile submitted for admin review!");
      setProfile((prev) =>
        prev ? { ...prev, submittedForVerification: true } : prev,
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to submit for verification");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        <div className="h-8 w-48 bg-[#F5F5F5] rounded-lg animate-pulse" />
        <div className="h-16 bg-[#F5F5F5] rounded-2xl animate-pulse" />
        <div className="h-52 bg-[#F5F5F5] rounded-2xl animate-pulse" />
        <div className="h-40 bg-[#F5F5F5] rounded-2xl animate-pulse" />
        <div className="h-64 bg-[#F5F5F5] rounded-2xl animate-pulse" />
      </div>
    );
  }

  const uploadedDocs = profile?.documents || [];
  const totalDocCount = uploadedDocs.length + pendingDocs.length;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#252C32]">
          Profile Management
        </h1>
        <p className="text-sm text-[#838383] mt-0.5">
          Complete your profile and submit it for admin verification
        </p>
      </div>

      {/* Verification banner */}
      {profile && <VerificationBanner profile={profile} />}

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <div className="bg-white rounded-2xl border border-[#E5E9EB] p-5">
          <SectionHeader
            icon={Building2}
            title="Company Identity"
            subtitle="Your logo and basic company information"
          />

          {/* Logo upload */}
          <div className="flex items-center gap-5 mb-5">
            <div
              onClick={() => logoInputRef.current?.click()}
              className="w-20 h-20 rounded-2xl border-2 border-dashed border-[#E5E9EB] bg-[#F5F5F5] flex items-center justify-center cursor-pointer hover:border-primary/40 transition shrink-0 overflow-hidden"
            >
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera size={24} className="text-[#B0B7C3]" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-[#252C32]">Company Logo</p>
              <p className="text-xs text-[#838383] mt-0.5">
                PNG, JPG up to 2MB
              </p>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="mt-2 text-xs text-primary font-medium hover:underline"
              >
                {logoPreview ? "Change logo" : "Upload logo"}
              </button>
              {logoFile && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠ Unsaved — click &quot;Save Profile&quot; to apply
                </p>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoSelect}
              />
            </div>
          </div>

          {/* Company name + email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel label="Company Name" required />
              <div className="relative">
                <Building2
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B7C3]"
                />
                <input
                  type="text"
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  placeholder="e.g. ABC Logistics Pvt. Ltd."
                  className="w-full pl-9 py-3 pr-3 rounded-xl bg-[#F5F5F5] text-sm text-[#252C32] placeholder:text-[#B0B7C3] outline-none focus:ring-2 focus:ring-primary/30 transition"
                />
              </div>
            </div>
            <div>
              <FieldLabel label="Email Address" />
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B7C3]"
                />
                <input
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="w-full pl-9 py-3 pr-3 rounded-xl bg-[#F0F0F0] text-sm text-[#838383] cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-[#B0B7C3] mt-1">
                Email cannot be changed
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E9EB] p-5">
          <SectionHeader
            icon={Phone}
            title="Contact & Location"
            subtitle="How partners can reach you"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                label: "Contact Number",
                name: "contactNumber",
                placeholder: "e.g. 9801234567",
                type: "tel",
                icon: Phone,
              },
              {
                label: "Company Location",
                name: "companyLocation",
                placeholder: "e.g. Kathmandu, Nepal",
                type: "text",
                icon: MapPin,
              },
              {
                label: "PAN / VAT Number",
                name: "panNo",
                placeholder: "e.g. 123456789",
                type: "text",
                icon: Hash,
              },
              {
                label: "Company Website",
                name: "companyWebsite",
                placeholder: "e.g. https://company.com",
                type: "url",
                icon: Globe,
              },
            ].map((field) => (
              <div key={field.name}>
                <FieldLabel label={field.label} />
                <div className="relative">
                  <field.icon
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B7C3]"
                  />
                  <input
                    type={field.type}
                    name={field.name}
                    value={form[field.name as keyof FormState]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    className="w-full pl-9 py-3 pr-3 rounded-xl bg-[#F5F5F5] text-sm text-[#252C32] placeholder:text-[#B0B7C3] outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E9EB] p-5">
          <SectionHeader
            icon={FileText}
            title="About the Company"
            subtitle="A short description shown to other companies"
          />
          <textarea
            name="companyDescription"
            value={form.companyDescription}
            onChange={handleChange}
            placeholder="Describe your company — services, experience, coverage area..."
            rows={4}
            className="w-full p-3 rounded-xl bg-[#F5F5F5] text-sm text-[#252C32] placeholder:text-[#B0B7C3] resize-none outline-none focus:ring-2 focus:ring-primary/30 transition"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            Save Profile
          </button>
        </div>
      </form>

      {/* ── Documents section (outside form — has its own submit) ──────────── */}
      <div className="bg-white rounded-2xl border border-[#E5E9EB] p-5 mt-5">
        <SectionHeader
          icon={ShieldCheck}
          title="Verification Documents"
          subtitle={`Upload company documents for admin verification (${totalDocCount}/5)`}
        />

        {/* Already uploaded documents */}
        {uploadedDocs.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            <p className="text-xs font-medium text-[#5B6871] mb-1">
              Uploaded Documents
            </p>
            {uploadedDocs.map((doc) => (
              <div
                key={doc._id}
                className="flex items-center justify-between px-3 py-2.5 bg-[#F5F5F5] rounded-xl"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={15} className="text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#252C32] truncate">
                      {doc.label ||
                        DOCUMENT_TYPES.find((t) => t.value === doc.type)
                          ?.label ||
                        doc.type}
                    </p>
                    <p className="text-xs text-[#838383]">
                      {DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label}
                      {" · "}
                      {new Date(doc.uploadedAt).toLocaleDateString("en-NP", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View
                  </a>
                  <button
                    onClick={() => handleDeleteDocument(doc._id)}
                    disabled={deletingId === doc._id}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-[#838383] hover:text-red-500 transition disabled:opacity-50"
                  >
                    {deletingId === doc._id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pending documents (selected, not yet uploaded) */}
        {pendingDocs.length > 0 && (
          <div className="flex flex-col gap-3 mb-4">
            <p className="text-xs font-medium text-[#5B6871]">
              Ready to Upload
            </p>
            {pendingDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-3 bg-amber-50 border border-amber-200 rounded-xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-[#252C32] truncate max-w-[60%]">
                    {doc.file.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => removePendingDoc(doc.id)}
                    className="p-1 rounded-lg hover:bg-red-100 text-[#838383] hover:text-red-500 transition"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-[#838383] mb-1">Document Type</p>
                    <select
                      value={doc.type}
                      onChange={(e) =>
                        updatePendingDoc(doc.id, "type", e.target.value)
                      }
                      className="w-full p-2 rounded-lg bg-white border border-[#E5E9EB] text-xs text-[#252C32] outline-none"
                    >
                      {DOCUMENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-[#838383] mb-1">
                      Label (optional)
                    </p>
                    <input
                      type="text"
                      value={doc.label}
                      onChange={(e) =>
                        updatePendingDoc(doc.id, "label", e.target.value)
                      }
                      placeholder="e.g. Reg 2024"
                      className="w-full p-2 rounded-lg bg-white border border-[#E5E9EB] text-xs text-[#252C32] outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Upload pending docs button */}
            <button
              type="button"
              onClick={handleUploadDocuments}
              disabled={isUploading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
            >
              {isUploading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Upload size={15} />
              )}
              {isUploading
                ? "Uploading..."
                : `Upload ${pendingDocs.length} Document(s)`}
            </button>
          </div>
        )}

        {/* Add document button */}
        {totalDocCount < 5 && (
          <button
            type="button"
            onClick={() => docInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#E5E9EB] rounded-xl text-sm text-[#838383] hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition"
          >
            <Plus size={16} />
            Add Document
          </button>
        )}

        {totalDocCount >= 5 && (
          <p className="text-xs text-[#838383] text-center mt-2">
            Maximum of 5 documents reached
          </p>
        )}

        <input
          ref={docInputRef}
          type="file"
          accept="image/*,.pdf"
          multiple
          className="hidden"
          onChange={handleDocSelect}
        />
      </div>

      {profile &&
        !profile.isAccountVerified &&
        !profile.submittedForVerification && (
          <div className="mt-5 pb-6 flex justify-end">
            <button
              type="button"
              onClick={handleSubmitForVerification}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ShieldCheck size={15} />
              )}
              Submit for Verification
            </button>
          </div>
        )}
    </div>
  );
}
