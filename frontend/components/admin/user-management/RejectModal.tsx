"use client";

import { useState } from "react";
import { XCircle, Loader2 } from "lucide-react";
import type { User } from "./types";

type Props = {
  user: User;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
};

export default function RejectModal({
  user,
  onClose,
  onConfirm,
  isLoading,
}: Props) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E5E9EB] p-6 w-full max-w-md">
        <h3 className="text-base font-semibold text-[#252C32] mb-1">
          Reject {user.companyName}?
        </h3>
        <p className="text-sm text-[#838383] mb-4">
          Provide a reason so the company knows what to fix.
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Company registration document is unclear. Please re-upload a higher quality scan."
          rows={3}
          className="w-full p-3 rounded-xl bg-[#F5F5F5] text-sm text-[#252C32] placeholder:text-[#B0B7C3] resize-none outline-none focus:ring-2 focus:ring-red-300 transition"
        />

        <div className="flex gap-3 mt-4 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#E5E9EB] text-sm text-[#5B6871] hover:bg-[#F5F5F5] transition"
          >
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason)}
            disabled={!reason.trim() || isLoading}
            className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium flex items-center gap-2 transition disabled:opacity-60"
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <XCircle size={14} />
            )}
            Reject Account
          </button>
        </div>
      </div>
    </div>
  );
}
