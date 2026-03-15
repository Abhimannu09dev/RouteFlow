"use client";

import { useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Phone,
  MapPin,
  Hash,
  Mail,
  XCircle,
  CheckCircle,
  ShieldCheck,
  Loader2,
  Eye,
  FileText,
} from "lucide-react";
import type { User } from "./types";
import { DOCUMENT_TYPE_LABELS } from "./types";
import VerificationBadge from "./VerificationBadge";

type Props = {
  user: User;
  onApprove: (id: string) => void;
  onReject: (user: User) => void;
  actionId: string | null;
};

export default function UserRow({
  user,
  onApprove,
  onReject,
  actionId,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const isActing = actionId === user._id;
  const canApprove = user.isVerified && !user.isAccountVerified;

  return (
    <div className="border-b border-[#F5F5F5] last:border-0">
      {/* ── Collapsed row ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAFAFA] cursor-pointer transition"
        onClick={() => setExpanded((p) => !p)}
      >
        {/* Logo / avatar */}
        <div className="w-10 h-10 rounded-xl bg-[#F5F5F5] flex items-center justify-center shrink-0 overflow-hidden">
          {user.companyLogo ? (
            <img
              src={user.companyLogo}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <Building2 size={18} className="text-[#B0B7C3]" />
          )}
        </div>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#252C32]">
              {user.companyName}
            </p>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                user.role === "manufacturer"
                  ? "bg-blue-50 text-blue-600"
                  : "bg-purple-50 text-purple-600"
              }`}
            >
              {user.role}
            </span>
          </div>
          <p className="text-xs text-[#838383] truncate">{user.email}</p>
        </div>

        {/* Badge + chevron */}
        <div className="flex items-center gap-3 shrink-0">
          <VerificationBadge user={user} />
          {expanded ? (
            <ChevronUp size={15} className="text-[#838383]" />
          ) : (
            <ChevronDown size={15} className="text-[#838383]" />
          )}
        </div>
      </div>

      {/* ── Expanded detail panel ───────────────────────────────────────────── */}
      {expanded && (
        <div className="px-5 pb-5 bg-[#FAFAFA] border-t border-[#F5F5F5]">
          {/* Detail grid */}
          <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            {user.contactNumber && (
              <div>
                <p className="text-xs text-[#838383]">Contact</p>
                <p className="text-sm text-[#252C32] flex items-center gap-1 mt-0.5">
                  <Phone size={12} className="text-primary" />
                  {user.contactNumber}
                </p>
              </div>
            )}
            {user.companyLocation && (
              <div>
                <p className="text-xs text-[#838383]">Location</p>
                <p className="text-sm text-[#252C32] flex items-center gap-1 mt-0.5">
                  <MapPin size={12} className="text-primary" />
                  {user.companyLocation}
                </p>
              </div>
            )}
            {user.panNo && (
              <div>
                <p className="text-xs text-[#838383]">PAN / VAT</p>
                <p className="text-sm text-[#252C32] flex items-center gap-1 mt-0.5">
                  <Hash size={12} className="text-primary" />
                  {user.panNo}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-[#838383]">Email</p>
              <p className="text-sm text-[#252C32] flex items-center gap-1 mt-0.5">
                <Mail size={12} className="text-primary" />
                {user.email}
              </p>
            </div>
          </div>

          {/* Description */}
          {user.companyDescription && (
            <p className="text-xs text-[#838383] bg-white border border-[#E5E9EB] rounded-xl px-3 py-2 mb-4 leading-relaxed">
              {user.companyDescription}
            </p>
          )}

          {/* Rejection reason */}
          {user.rejectionReason && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl mb-4">
              <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-red-600">
                  Rejection Reason
                </p>
                <p className="text-xs text-red-500 mt-0.5">
                  {user.rejectionReason}
                </p>
              </div>
            </div>
          )}

          {/* ── Documents — replaces old single companyDocument field ───────── */}
          {user.documents && user.documents.length > 0 ? (
            <div className="mb-4">
              <p className="text-xs text-[#838383] mb-2 flex items-center gap-1">
                <FileText size={11} />
                Verification Documents ({user.documents.length})
              </p>
              <div className="flex flex-col gap-2">
                {user.documents.map((doc) => (
                  <a
                    key={doc._id}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-[#E5E9EB] rounded-xl text-xs text-primary hover:bg-primary/5 transition w-fit"
                  >
                    <Eye size={13} />
                    {/* Show custom label if set, otherwise use the type label */}
                    {doc.label
                      ? doc.label
                      : DOCUMENT_TYPE_LABELS[doc.type] || doc.type}
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-4 px-3 py-2.5 bg-[#F5F5F5] rounded-xl">
              <p className="text-xs text-[#838383]">
                No documents uploaded yet
              </p>
            </div>
          )}

          {/* Action buttons — only shown when pending */}
          {canApprove && (
            <div className="flex gap-3 pt-3 border-t border-[#E5E9EB]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove(user._id);
                }}
                disabled={isActing}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-xl transition disabled:opacity-60"
              >
                {isActing ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCircle size={13} />
                )}
                Approve Account
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReject(user);
                }}
                disabled={isActing}
                className="flex items-center gap-2 px-4 py-2 bg-red-400 hover:bg-red-500 text-white text-xs font-medium rounded-xl transition disabled:opacity-60"
              >
                <XCircle size={13} />
                Reject
              </button>
            </div>
          )}

          {/* Verified state */}
          {user.isAccountVerified && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-xs text-green-600 mt-2">
              <ShieldCheck size={13} />
              This account has been verified and approved
            </div>
          )}
        </div>
      )}
    </div>
  );
}
