"use client";
import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Bell,
  Trash2,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Languages,
} from "lucide-react";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { settingsAPI, type NotificationPreferences } from "@/lib/api";
import { useRouter } from "next/navigation";
import "@/lib/i18n";

//  Sub-components 

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#E5E9EB] rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-[#E5E9EB] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#F5F7F8] flex items-center justify-center shrink-0">
          <Icon size={18} color="#5B6871" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#252C32]">{title}</h2>
          <p className="text-xs text-[#9AA6AC] mt-0.5">{description}</p>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[#F5F7F8] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#252C32]">{label}</p>
        <p className="text-xs text-[#9AA6AC] mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          checked ? "bg-teal-500" : "bg-[#DDE2E6]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

//  Change Password Section 

function ChangePasswordSection() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [show, setShow] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (form.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await settingsAPI.changePassword(
        form.currentPassword,
        form.newPassword,
        form.confirmPassword,
      );
      toast.success("Password changed successfully");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to change password",
      );
    } finally {
      setLoading(false);
    }
  }

  function PasswordInput({
    name,
    label,
    showKey,
  }: {
    name: keyof typeof form;
    label: string;
    showKey: keyof typeof show;
  }) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[#5B6871]">{label}</label>
        <div className="relative">
          <input
            type={show[showKey] ? "text" : "password"}
            name={name}
            value={form[name]}
            onChange={handleChange}
            placeholder="••••••••"
            className="w-full h-10 px-3 pr-10 rounded-xl border border-[#E5E9EB] text-sm text-[#252C32] placeholder-[#9AA6AC] focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 transition"
          />
          <button
            type="button"
            onClick={() =>
              setShow((prev) => ({ ...prev, [showKey]: !prev[showKey] }))
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9AA6AC] hover:text-[#5B6871] transition"
          >
            {show[showKey] ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <SectionCard
      title="Change Password"
      description="Update your account password"
      icon={Lock}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
        <PasswordInput
          name="currentPassword"
          label="Current Password"
          showKey="current"
        />
        <PasswordInput name="newPassword" label="New Password" showKey="new" />
        <PasswordInput
          name="confirmPassword"
          label="Confirm New Password"
          showKey="confirm"
        />
        <button
          type="submit"
          disabled={
            loading ||
            !form.currentPassword ||
            !form.newPassword ||
            !form.confirmPassword
          }
          className="h-10 px-6 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2 w-fit"
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <CheckCircle size={15} />
          )}
          Update Password
        </button>
      </form>
    </SectionCard>
  );
}

//  Notification Preferences Section 

function NotificationSection() {
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    emailNotifications: true,
    orderStatusUpdates: true,
    bidUpdates: true,
    newOrderAlerts: true,
    chatMessages: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const DEFAULT_PREFS: NotificationPreferences = {
    emailNotifications: true,
    orderStatusUpdates: true,
    bidUpdates: true,
    newOrderAlerts: true,
    chatMessages: true,
  };

  useEffect(() => {
    settingsAPI
      .getNotificationPreferences()
      .then((data) =>
        setPrefs({ ...DEFAULT_PREFS, ...(data.preferences || {}) }),
      )
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleToggle(key: keyof NotificationPreferences, val: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await settingsAPI.updateNotificationPreferences(prefs);
      toast.success("Notification preferences saved");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SectionCard
        title="Notification Preferences"
        description="Choose what you want to be notified about"
        icon={Bell}
      >
        <div className="flex items-center gap-2 text-sm text-[#9AA6AC]">
          <Loader2 size={15} className="animate-spin" /> Loading preferences...
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Notification Preferences"
      description="Choose what you want to be notified about"
      icon={Bell}
    >
      <div className="flex flex-col">
        <ToggleRow
          label="Email Notifications"
          description="Receive notifications via email"
          checked={prefs.emailNotifications}
          onChange={(v) => handleToggle("emailNotifications", v)}
        />
        <ToggleRow
          label="Order Status Updates"
          description="Get notified when your order status changes"
          checked={prefs.orderStatusUpdates}
          onChange={(v) => handleToggle("orderStatusUpdates", v)}
        />
        <ToggleRow
          label="Bid Updates"
          description="Get notified about new bids and bid responses"
          checked={prefs.bidUpdates}
          onChange={(v) => handleToggle("bidUpdates", v)}
        />
        <ToggleRow
          label="New Order Alerts"
          description="Get notified when new orders are available"
          checked={prefs.newOrderAlerts}
          onChange={(v) => handleToggle("newOrderAlerts", v)}
        />
        <ToggleRow
          label="Chat Messages"
          description="Get notified about new chat messages"
          checked={prefs.chatMessages}
          onChange={(v) => handleToggle("chatMessages", v)}
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-5 h-10 px-6 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2 w-fit"
      >
        {saving ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <CheckCircle size={15} />
        )}
        Save Preferences
      </button>
    </SectionCard>
  );
}

//  Account Deactivation Section 

function DeactivateSection({ role }: { role: "manufacturer" | "logistics" }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDeactivate() {
    if (!password) {
      toast.error("Please enter your password");
      return;
    }
    setLoading(true);
    try {
      await settingsAPI.deactivateAccount(password);
      toast.success("Account deactivated. You will be redirected.");
      setTimeout(() => router.replace("/auth?action=sign-in"), 1500);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to deactivate account",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard
      title="Deactivate Account"
      description="Temporarily disable your account — you can reactivate by contacting support"
      icon={Trash2}
    >
      {!showConfirm ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
            <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div className="text-xs text-red-700 leading-relaxed">
              <p className="font-semibold mb-1">Before you deactivate:</p>
              <ul className="list-disc list-inside flex flex-col gap-0.5">
                <li>Your active orders will remain in the system</li>
                <li>You will be logged out immediately</li>
                <li>
                  You won&apos;t be able to log in until reactivated by support
                </li>
                <li>All your data will be preserved</li>
              </ul>
            </div>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            className="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition flex items-center gap-2 w-fit"
          >
            <Trash2 size={15} />
            Deactivate Account
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 max-w-sm">
          <p className="text-sm text-[#252C32]">
            Enter your password to confirm account deactivation.
          </p>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full h-10 px-3 pr-10 rounded-xl border border-red-200 text-sm text-[#252C32] placeholder-[#9AA6AC] focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9AA6AC] hover:text-[#5B6871]"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowConfirm(false);
                setPassword("");
              }}
              className="h-10 px-5 rounded-xl border border-[#E5E9EB] text-sm text-[#5B6871] hover:bg-[#F5F7F8] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDeactivate}
              disabled={loading || !password}
              className="h-10 px-5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Trash2 size={15} />
              )}
              Confirm Deactivation
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

//  Language Section 

function LanguageSection() {
  const { t, i18n } = useTranslation();
  const [current, setCurrent] = useState(
    i18n.language?.startsWith("ne") ? "ne" : "en",
  );

  function handleChange(lang: "en" | "ne") {
    setCurrent(lang);
    i18n.changeLanguage(lang);
    toast.success(t("settings.languageSaved"));
  }

  return (
    <SectionCard
      title={t("settings.language")}
      description={t("settings.languageDesc")}
      icon={Languages}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm text-[#5B6871] mr-2">
          {t("settings.languageEnglish")}
        </span>
        {/* Toggle */}
        <button
          onClick={() => handleChange(current === "en" ? "ne" : "en")}
          className={`relative w-14 h-7 rounded-full transition-colors ${
            current === "ne" ? "bg-teal-500" : "bg-[#DDE2E6]"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform text-[10px] font-bold flex items-center justify-center text-[#252C32] ${
              current === "ne" ? "translate-x-7" : "translate-x-0"
            }`}
          >
            {current === "ne" ? "ने" : "EN"}
          </span>
        </button>
        <span className="text-sm text-[#5B6871]">नेपाली</span>
      </div>
      <p className="text-xs text-[#9AA6AC] mt-3">
        {current === "ne"
          ? "हाल चयन गरिएको: नेपाली"
          : "Currently selected: English"}
      </p>
    </SectionCard>
  );
}

//  Main Settings Page 

interface SettingsPageProps {
  role: "manufacturer" | "logistics";
}

export default function SettingsPage({ role }: SettingsPageProps) {
  const { t } = useTranslation();
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5 py-2">
      <div>
        <h1 className="text-lg font-semibold text-[#252C32]">
          {t("settings.title")}
        </h1>
        <p className="text-sm text-[#9AA6AC] mt-0.5">
          {t("settings.subtitle")}
        </p>
      </div>
      <LanguageSection />
      <ChangePasswordSection />
      <NotificationSection />
      <DeactivateSection role={role} />
    </div>
  );
}
