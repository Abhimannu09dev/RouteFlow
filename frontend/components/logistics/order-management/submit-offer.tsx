"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { priceOfferAPI } from "@/lib/api";
import {
  X,
  DollarSign,
  Clock,
  FileText,
  Loader2,
  Send,
  RefreshCw,
  Info,
} from "lucide-react";

type Offer = {
  _id: string;
  proposedPrice: number;
  estimatedDeliveryDays: number;
  note: string;
  status: string;
  updatedAt?: string;
};

type Props = {
  orderId: string;
  orderDetails: string;
  expectedPrice?: number | null;
  existingOffer: Offer | null; // if set, we are updating an existing bid
  onClose: () => void;
  onSuccess: (offer: Offer) => void;
};

export default function SubmitOfferModal({
  orderId,
  orderDetails,
  expectedPrice,
  existingOffer,
  onClose,
  onSuccess,
}: Props) {
  const isUpdate = !!(existingOffer && existingOffer.status === "pending");

  const [price, setPrice] = useState(
    existingOffer?.proposedPrice?.toString() || "",
  );
  const [days, setDays] = useState(
    existingOffer?.estimatedDeliveryDays?.toString() || "",
  );
  const [note, setNote] = useState(existingOffer?.note || "");
  const [isLoading, setIsLoading] = useState(false);

  const numPrice = Number(price);
  const priceDiff =
    expectedPrice && numPrice > 0 ? numPrice - expectedPrice : null;
  const isAboveExpected = priceDiff !== null && priceDiff > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!price || numPrice <= 0) {
      toast.error("Enter a valid price");
      return;
    }
    if (!days || Number(days) <= 0) {
      toast.error("Enter estimated delivery days");
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        proposedPrice: numPrice,
        estimatedDeliveryDays: Number(days),
        note: note.trim(),
      };

      let data;
      if (isUpdate) {
        data = await priceOfferAPI.updateOffer(
          orderId,
          existingOffer._id,
          payload,
        );
        toast.success("Bid updated successfully!");
      } else {
        data = await priceOfferAPI.submitOffer(orderId, payload);
        toast.success("Bid submitted successfully!");
      }

      onSuccess(data.offer);
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit bid");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleWithdraw() {
    if (!existingOffer) return;
    setIsLoading(true);
    try {
      await priceOfferAPI.withdrawOffer(orderId, existingOffer._id);
      toast.success("Offer withdrawn");
      onSuccess({ ...existingOffer, status: "withdrawn" });
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to withdraw offer");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E5E9EB] w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F5F5F5]">
          <div>
            <p className="text-sm font-semibold text-[#252C32]">
              {isUpdate ? "Update Your Offer" : "Submit Price Offer"}
            </p>
            <p className="text-xs text-[#838383] mt-0.5 truncate max-w-[280px]">
              {orderDetails}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F5F5F5] text-[#838383] transition"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {expectedPrice && expectedPrice > 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
              <Info size={14} className="text-blue-500 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-700">
                  Manufacturer&apos;s Expected Price
                </p>
                <p className="text-sm font-bold text-blue-800">
                  NPR {expectedPrice.toLocaleString()}
                </p>
                <p className="text-xs text-blue-500 mt-0.5">
                  You can bid above or below this price
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-[#5B6871] mb-1.5 block">
              Your Proposed Price (NPR) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <DollarSign
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B7C3]"
              />
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 14000"
                min={1}
                className="w-full pl-9 pr-3 py-3 rounded-xl bg-[#F5F5F5] text-sm text-[#252C32] placeholder:text-[#B0B7C3] outline-none focus:ring-2 focus:ring-primary/30 transition"
              />
            </div>

            {expectedPrice && price && Number(price) > 0 && (
              <div
                className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${
                  bidAboveExpected ? "text-amber-600" : "text-green-600"
                }`}
              >
                <DollarSign size={11} />
                {bidAboveExpected
                  ? `NPR ${(Number(price) - expectedPrice).toLocaleString()} above expected price`
                  : `NPR ${(expectedPrice - Number(price)).toLocaleString()} below expected price`}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-[#5B6871] mb-1.5 block">
              Estimated Delivery Days <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Clock
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B7C3]"
              />
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder="e.g. 3"
                min={1}
                className="w-full pl-9 pr-3 py-3 rounded-xl bg-[#F5F5F5] text-sm text-[#252C32] placeholder:text-[#B0B7C3] outline-none focus:ring-2 focus:ring-primary/30 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#5B6871] mb-1.5 block">
              Additional Note{" "}
              <span className="text-[#B0B7C3] font-normal">(optional)</span>
            </label>
            <div className="relative">
              <FileText
                size={14}
                className="absolute left-3 top-3 text-[#B0B7C3]"
              />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Includes packaging, door-to-door delivery..."
                rows={3}
                className="w-full pl-9 pr-3 py-3 rounded-xl bg-[#F5F5F5] text-sm text-[#252C32] placeholder:text-[#B0B7C3] resize-none outline-none focus:ring-2 focus:ring-primary/30 transition"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            {isUpdate && (
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-xs font-medium hover:bg-red-50 transition disabled:opacity-60"
              >
                <X size={13} />
                Withdraw
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : isUpdate ? (
                <RefreshCw size={15} />
              ) : (
                <Send size={15} />
              )}
              {isLoading
                ? "Submitting..."
                : isUpdate
                  ? "Update Offer"
                  : "Submit Offer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
