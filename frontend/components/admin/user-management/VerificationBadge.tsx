import { ShieldCheck, ShieldAlert, XCircle, Clock } from "lucide-react";
import type { User } from "./types";

export default function VerificationBadge({ user }: { user: User }) {
  // Already verified by admin
  if (user.isAccountVerified)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 border border-green-200 text-green-600">
        <ShieldCheck size={10} />
        Verified
      </span>
    );

  // Submitted and waiting for admin review
  if (user.submittedForVerification)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 border border-blue-200 text-blue-600">
        <Clock size={10} />
        Under Review
      </span>
    );

  // Rejected by admin
  if (user.rejectionReason)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 border border-red-200 text-red-500">
        <XCircle size={10} />
        Rejected
      </span>
    );

  // Email not yet OTP-verified
  if (!user.isVerified)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 border border-gray-200 text-gray-500">
        <Clock size={10} />
        Email Unverified
      </span>
    );

  // Email verified but not yet submitted for review
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 border border-amber-200 text-amber-600">
      <ShieldAlert size={10} />
      Not Submitted
    </span>
  );
}
