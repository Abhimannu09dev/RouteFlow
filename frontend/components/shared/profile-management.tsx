"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Globe,
  Hash,
  Camera,
  Upload,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Save,
} from "lucide-react";

// ── Types

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
  companyDocument?: string;
  isVerified: boolean;
  isAccountVerified: boolean;
};

type FormState = {
  companyName: string;
  contactNumber: string;
  panNo: string;
  companyLocation: string;
  companyDescription: string;
  companyWebsite: string;
  companyLogo: string;
  companyDocument: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function apiFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || data.message || "Request failed");
  return data;
}

// ── Sub-components

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

function InputField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  icon: Icon,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <div className="relative">
        {Icon && (
          <Icon
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B7C3]"
          />
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full py-3 pr-3 rounded-xl bg-[#F5F5F5] text-sm text-[#252C32] placeholder:text-[#B0B7C3] outline-none focus:ring-2 focus:ring-primary/30 transition ${
            Icon ? "pl-9" : "pl-3"
          }`}
        />
      </div>
    </div>
  );
}

// ── File to base64 helper

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Main Component

export default function ProfileManagement() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<FormState>({
    companyName: "",
    contactNumber: "",
    panNo: "",
    companyLocation: "",
    companyDescription: "",
    companyWebsite: "",
    companyLogo: "",
    companyDocument: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [documentName, setDocumentName] = useState<string>("");
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
          companyLogo: u.companyLogo || "",
          companyDocument: u.companyDocument || "",
        });
        if (u.companyLogo) setLogoPreview(u.companyLogo);
        if (u.companyDocument) setDocumentName("Document uploaded");
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

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    const base64 = await fileToBase64(file);
    setLogoPreview(base64);
    setForm((prev) => ({ ...prev, companyLogo: base64 }));
  }

  async function handleDocChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Document must be under 5MB");
      return;
    }
    const base64 = await fileToBase64(file);
    setDocumentName(file.name);
    setForm((prev) => ({ ...prev, companyDocument: base64 }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }

    setIsSaving(true);
    try {
      const data = await apiFetch("/profile", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setProfile(data.user);
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        <div className="h-8 w-48 bg-[#F5F5F5] rounded-lg animate-pulse" />
        <div className="h-40 bg-[#F5F5F5] rounded-2xl animate-pulse" />
        <div className="h-64 bg-[#F5F5F5] rounded-2xl animate-pulse" />
        <div className="h-40 bg-[#F5F5F5] rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#252C32]">
          Profile Management
        </h1>
        <p className="text-sm text-[#838383] mt-0.5">
          Complete your company profile to get verified by the admin
        </p>
      </div>

      {/* Verification status banner */}
      {profile && (
        <div
          className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border mb-5 ${
            profile.isAccountVerified
              ? "bg-green-50 border-green-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          {profile.isAccountVerified ? (
            <ShieldCheck size={18} className="text-green-600 shrink-0" />
          ) : (
            <ShieldAlert size={18} className="text-amber-600 shrink-0" />
          )}
          <div>
            <p
              className={`text-sm font-semibold ${
                profile.isAccountVerified ? "text-green-700" : "text-amber-700"
              }`}
            >
              {profile.isAccountVerified
                ? "Account Verified"
                : "Pending Admin Verification"}
            </p>
            <p
              className={`text-xs mt-0.5 ${
                profile.isAccountVerified ? "text-green-600" : "text-amber-600"
              }`}
            >
              {profile.isAccountVerified
                ? "Your company has been verified. You have full access to the platform."
                : "Complete your profile and upload your company documents. An admin will review and verify your account."}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="bg-white rounded-2xl border border-[#E5E9EB] p-5">
          <SectionHeader
            icon={Building2}
            title="Company Identity"
            subtitle="Your logo and basic company information"
          />

          {/* Logo upload */}
          <div className="flex items-center gap-5 mb-5">
            <div
              className="w-20 h-20 rounded-2xl border-2 border-dashed border-[#E5E9EB] bg-[#F5F5F5] flex items-center justify-center cursor-pointer hover:border-primary/40 transition shrink-0 overflow-hidden"
              onClick={() => logoInputRef.current?.click()}
            >
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Company logo"
                  className="w-full h-full object-cover rounded-2xl"
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
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
          </div>

          {/* Company name + email (read-only) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Company Name"
              name="companyName"
              value={form.companyName}
              onChange={handleChange}
              placeholder="e.g. ABC Logistics Pvt. Ltd."
              required
              icon={Building2}
            />
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
            subtitle="How logistics partners or manufacturers can reach you"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Contact Number"
              name="contactNumber"
              value={form.contactNumber}
              onChange={handleChange}
              placeholder="e.g. 9801234567"
              type="tel"
              icon={Phone}
            />
            <InputField
              label="Company Location"
              name="companyLocation"
              value={form.companyLocation}
              onChange={handleChange}
              placeholder="e.g. Kathmandu, Nepal"
              icon={MapPin}
            />
            <InputField
              label="PAN / VAT Number"
              name="panNo"
              value={form.panNo}
              onChange={handleChange}
              placeholder="e.g. 123456789"
              icon={Hash}
            />
            <InputField
              label="Company Website"
              name="companyWebsite"
              value={form.companyWebsite}
              onChange={handleChange}
              placeholder="e.g. https://yourcompany.com"
              type="url"
              icon={Globe}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E9EB] p-5">
          <SectionHeader
            icon={FileText}
            title="About the Company"
            subtitle="A short description shown to other companies on the platform"
          />
          <textarea
            name="companyDescription"
            value={form.companyDescription}
            onChange={handleChange}
            placeholder="Describe your company — what you do, how long you've been operating, your service area..."
            rows={4}
            className="w-full p-3 rounded-xl bg-[#F5F5F5] text-sm text-[#252C32] placeholder:text-[#B0B7C3] resize-none outline-none focus:ring-2 focus:ring-primary/30 transition"
          />
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E9EB] p-5">
          <SectionHeader
            icon={ShieldCheck}
            title="Verification Documents"
            subtitle="Upload your company registration document for admin verification"
          />

          <div
            className="w-full border-2 border-dashed border-[#E5E9EB] rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition"
            onClick={() => docInputRef.current?.click()}
          >
            <div className="w-12 h-12 rounded-xl bg-[#F5F5F5] flex items-center justify-center mb-3">
              <Upload size={20} className="text-[#B0B7C3]" />
            </div>
            {documentName ? (
              <>
                <p className="text-sm font-medium text-primary">
                  {documentName}
                </p>
                <p className="text-xs text-[#838383] mt-1">Click to replace</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-[#252C32]">
                  Upload Company Registration Document
                </p>
                <p className="text-xs text-[#838383] mt-1">
                  PDF, PNG or JPG — max 5MB
                </p>
              </>
            )}
            <input
              ref={docInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleDocChange}
            />
          </div>

          {profile?.isAccountVerified && (
            <p className="text-xs text-green-600 mt-3 flex items-center gap-1.5">
              <ShieldCheck size={13} />
              Your documents have been verified by the admin
            </p>
          )}
        </div>

        <div className="flex justify-end pb-6">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={15} />
                Save Profile
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
