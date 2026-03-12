"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { orderAPI, type CreateOrderPayload } from "@/lib/api";
import {
  Package,
  MapPin,
  Truck,
  FileText,
  ChevronRight,
  Loader2,
} from "lucide-react";

const NEPALI_CITIES = [
  "Kathmandu",
  "Lalitpur",
  "Bhaktapur",
  "Pokhara",
  "Biratnagar",
  "Birgunj",
  "Dharan",
  "Janakpur",
  "Hetauda",
  "Nepalgunj",
  "Butwal",
  "Dhangadhi",
  "Itahari",
  "Bharatpur",
  "Gorkha",
];

const VEHICLE_TYPES = [
  { label: "Motorcycle (up to 20 kg)", value: "motorcycle" },
  { label: "Small Van (up to 500 kg)", value: "small_van" },
  { label: "Large Van (up to 1,500 kg)", value: "large_van" },
  { label: "Truck (up to 5,000 kg)", value: "truck" },
  { label: "Large Truck (5,000 kg+)", value: "large_truck" },
];

type FormState = {
  productDetails: string;
  quantity: string;
  weight: string;
  vehicleType: string;
  routeFrom: string;
  routeTo: string;
  invoiceNeeded: boolean;
  vatBillNeeded: boolean;
  additionalInfo: string;
};

const INITIAL_FORM: FormState = {
  productDetails: "",
  quantity: "",
  weight: "",
  vehicleType: "",
  routeFrom: "",
  routeTo: "",
  invoiceNeeded: false,
  vatBillNeeded: false,
  additionalInfo: "",
};

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
        <Icon size={18} className="text-primary" />
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
    <label className="text-xs font-medium text-[#5B6871] mb-1 block">
      {label}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 text-left ${
        checked
          ? "border-primary bg-primary/5"
          : "border-[#E5E9EB] bg-[#F5F5F5] hover:border-gray-300"
      }`}
    >
      <div>
        <p
          className={`text-sm font-medium ${
            checked ? "text-primary" : "text-[#252C32]"
          }`}
        >
          {label}
        </p>
        <p className="text-xs text-[#838383] mt-0.5">{hint}</p>
      </div>
      <div
        className={`w-11 h-6 rounded-full transition-all duration-200 shrink-0 relative ${
          checked ? "bg-primary" : "bg-gray-300"
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </div>
    </button>
  );
}

export default function OrderPlacementForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof FormState]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function handleToggle(field: "invoiceNeeded" | "vatBillNeeded") {
    return (value: boolean) => setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState, string>> = {};

    if (!form.productDetails.trim())
      newErrors.productDetails = "Product details are required";

    if (!form.quantity || Number(form.quantity) <= 0)
      newErrors.quantity = "Enter a valid quantity";

    if (!form.weight || Number(form.weight) <= 0)
      newErrors.weight = "Enter a valid weight";

    if (!form.vehicleType) newErrors.vehicleType = "Select a vehicle type";

    if (!form.routeFrom) newErrors.routeFrom = "Select pickup city";

    if (!form.routeTo) newErrors.routeTo = "Select destination city";

    if (form.routeFrom && form.routeTo && form.routeFrom === form.routeTo) {
      newErrors.routeTo = "Destination must differ from pickup";
      toast.error("Pickup and destination cannot be the same");
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) {
      toast.error("Please fix the errors before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateOrderPayload = {
        productDetails: form.productDetails.trim(),
        quantity: Number(form.quantity),
        weight: Number(form.weight),
        vehicleType: form.vehicleType,
        invoiceNeeded: form.invoiceNeeded,
        vatBillNeeded: form.vatBillNeeded,
        routeFrom: form.routeFrom,
        routeTo: form.routeTo,
        additionalInfo: form.additionalInfo.trim() || undefined,
      };

      await orderAPI.createOrder(payload);

      toast.success("Order placed successfully!");
      setTimeout(() => {
        router.push("/manufacturer/order-management");
      }, 1500);
    } catch (error: any) {
      console.error(error);

      if (error?.message) {
        toast.error(error.message);
      } else {
        toast.error("Something went wrong while placing the order.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    toast.info("Order creation cancelled.");
    toast.info("Order creation cancelled.");
    setTimeout(() => router.push("/manufacturer/order-management"), 1500);
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#252C32]">
          Place New Order
        </h1>
        <p className="text-sm text-[#838383] mt-0.5">
          Fill in the shipment details below to request a logistics partner
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="bg-white rounded-2xl border border-[#E5E9EB] p-5">
          <SectionHeader
            icon={Package}
            title="Product Information"
            subtitle="Describe what needs to be shipped"
          />

          {/* Product Details */}
          <div className="mb-4">
            <FieldLabel label="Product Details" required />
            <textarea
              name="productDetails"
              value={form.productDetails}
              onChange={handleChange}
              placeholder="e.g. Cotton fabric rolls, electronics components, raw materials..."
              rows={3}
              className={`w-full p-3 rounded-xl bg-[#F5F5F5] text-sm text-[#252C32] placeholder:text-[#B0B7C3] resize-none outline-none focus:ring-2 focus:ring-primary/30 transition ${
                errors.productDetails ? "ring-2 ring-red-300" : ""
              }`}
            />
            {errors.productDetails && (
              <p className="text-xs text-red-400 mt-1">
                {errors.productDetails}
              </p>
            )}
          </div>

          {/* Quantity + Weight */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel label="Quantity (units)" required />
              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                placeholder="e.g. 100"
                min={1}
                className={`w-full p-3 rounded-xl bg-[#F5F5F5] text-sm text-[#252C32] placeholder:text-[#B0B7C3] outline-none focus:ring-2 focus:ring-primary/30 transition ${
                  errors.quantity ? "ring-2 ring-red-300" : ""
                }`}
              />
              {errors.quantity && (
                <p className="text-xs text-red-400 mt-1">{errors.quantity}</p>
              )}
            </div>
            <div>
              <FieldLabel label="Total Weight (kg)" required />
              <input
                type="number"
                name="weight"
                value={form.weight}
                onChange={handleChange}
                placeholder="e.g. 250"
                min={0.1}
                step={0.1}
                className={`w-full p-3 rounded-xl bg-[#F5F5F5] text-sm text-[#252C32] placeholder:text-[#B0B7C3] outline-none focus:ring-2 focus:ring-primary/30 transition ${
                  errors.weight ? "ring-2 ring-red-300" : ""
                }`}
              />
              {errors.weight && (
                <p className="text-xs text-red-400 mt-1">{errors.weight}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 2: Route */}
        <div className="bg-white rounded-2xl border border-[#E5E9EB] p-5">
          <SectionHeader
            icon={MapPin}
            title="Shipment Route"
            subtitle="Where is the shipment going?"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel label="Pickup City" required />
              <select
                name="routeFrom"
                value={form.routeFrom}
                onChange={handleChange}
                className={`w-full p-3 rounded-xl bg-[#F5F5F5] text-sm text-[#252C32] outline-none focus:ring-2 focus:ring-primary/30 transition ${
                  errors.routeFrom ? "ring-2 ring-red-300" : ""
                }`}
              >
                <option value="" disabled>
                  Select city
                </option>
                {NEPALI_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              {errors.routeFrom && (
                <p className="text-xs text-red-400 mt-1">{errors.routeFrom}</p>
              )}
            </div>

            {/* Arrow between selects */}
            <div className="relative">
              <FieldLabel label="Destination City" required />
              <select
                name="routeTo"
                value={form.routeTo}
                onChange={handleChange}
                className={`w-full p-3 rounded-xl bg-[#F5F5F5] text-sm text-[#252C32] outline-none focus:ring-2 focus:ring-primary/30 transition ${
                  errors.routeTo ? "ring-2 ring-red-300" : ""
                }`}
              >
                <option value="" disabled>
                  Select city
                </option>
                {NEPALI_CITIES.filter((c) => c !== form.routeFrom).map(
                  (city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ),
                )}
              </select>
              {errors.routeTo && (
                <p className="text-xs text-red-400 mt-1">{errors.routeTo}</p>
              )}
            </div>
          </div>

          {/* Route Preview */}
          {form.routeFrom && form.routeTo && (
            <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-primary/5 rounded-xl border border-primary/20">
              <MapPin size={14} className="text-primary shrink-0" />
              <span className="text-sm text-[#252C32] font-medium">
                {form.routeFrom}
              </span>
              <ChevronRight size={14} className="text-[#838383]" />
              <span className="text-sm text-[#252C32] font-medium">
                {form.routeTo}
              </span>
            </div>
          )}
        </div>

        {/* ── Section 3: Vehicle  */}
        <div className="bg-white rounded-2xl border border-[#E5E9EB] p-5">
          <SectionHeader
            icon={Truck}
            title="Vehicle Requirement"
            subtitle="Select the vehicle type for this shipment"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {VEHICLE_TYPES.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => {
                  setForm((prev) => ({ ...prev, vehicleType: v.value }));
                  setErrors((prev) => ({ ...prev, vehicleType: undefined }));
                }}
                className={`p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                  form.vehicleType === v.value
                    ? "border-primary bg-primary/5"
                    : "border-[#E5E9EB] hover:border-gray-300"
                }`}
              >
                <p
                  className={`text-sm font-medium ${
                    form.vehicleType === v.value
                      ? "text-primary"
                      : "text-[#252C32]"
                  }`}
                >
                  {v.label.split("(")[0].trim()}
                </p>
                <p className="text-xs text-[#838383] mt-0.5">
                  {v.label.match(/\(([^)]+)\)/)?.[1]}
                </p>
              </button>
            ))}
          </div>
          {errors.vehicleType && (
            <p className="text-xs text-red-400 mt-2">{errors.vehicleType}</p>
          )}
        </div>

        {/* ── Section 4: Documents */}
        <div className="bg-white rounded-2xl border border-[#E5E9EB] p-5">
          <SectionHeader
            icon={FileText}
            title="Document Requirements"
            subtitle="Select which documents are needed for this shipment"
          />

          <div className="flex flex-col gap-3">
            <Toggle
              checked={form.invoiceNeeded}
              onChange={handleToggle("invoiceNeeded")}
              label="Invoice Required"
              hint="Logistics partner must provide an invoice for this shipment"
            />
            <Toggle
              checked={form.vatBillNeeded}
              onChange={handleToggle("vatBillNeeded")}
              label="VAT Bill Required"
              hint="Logistics partner must provide a VAT bill for this shipment"
            />
          </div>
        </div>

        {/* ── Section 5: Additional Info */}
        <div className="bg-white rounded-2xl border border-[#E5E9EB] p-5">
          <SectionHeader
            icon={FileText}
            title="Additional Information"
            subtitle="Any special instructions for the logistics partner (optional)"
          />
          <textarea
            name="additionalInfo"
            value={form.additionalInfo}
            onChange={handleChange}
            placeholder="e.g. Fragile items, handle with care. Deliver before 5 PM..."
            rows={3}
            className="w-full p-3 rounded-xl bg-[#F5F5F5] text-sm text-[#252C32] placeholder:text-[#B0B7C3] resize-none outline-none focus:ring-2 focus:ring-primary/30 transition"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-xl border border-[#E5E9EB] text-sm font-medium text-[#5B6871] hover:bg-[#F5F5F5] transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-medium flex items-center gap-2 transition disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Placing Order...
              </>
            ) : (
              <>
                <Package size={15} />
                Place Order
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
