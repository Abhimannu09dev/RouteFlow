"use client";

import { InputNumber } from "antd";
import { useState } from "react";

type FormData = {
  name: string;
  contactNumber: number | null;
  panNo: string;
  companyLocation: string;
  companyDescription: string;
  companyLogo: File | null;
  companyDocument: File | null;
};

const BasicInformation = () => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    contactNumber: null,
    panNo: "",
    companyLocation: "",
    companyDescription: "",
    companyLogo: null,
    companyDocument: null,
  });

  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFormData((prev) => ({ ...prev, companyLogo: file }));
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFormData((prev) => ({ ...prev, companyDocument: file }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      contactNumber: formData.contactNumber
        ? String(formData.contactNumber)
        : "",
      companyLogo: formData.companyLogo?.name ?? "",
      companyDocument: formData.companyDocument?.name ?? "",
    };

    console.log("Form Data:", payload);
  };

  return (
    <section className="md:max-w-4xl p-5 rounded-3xl mb-10 justify-self-center bg-gray-50">
      <h2 className="font-semibold text-xl">Basic Information</h2>
      <p className="text-sm mb-5">
        Tell us about your company and key contact details.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Logo */}
          <div className="flex flex-col">
            <label
              className="block font-medium mb-2"
              htmlFor="companyLogo"
              style={{ color: "var(--color-grayish)" }}
            >
              Logo
            </label>

            <label className="bg-white rounded-lg border border-gray-300 p-4 text-center font-medium cursor-pointer">
              <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
                {formData.companyLogo?.name ?? "Upload"}
              </span>
              <input
                type="file"
                id="companyLogo"
                name="companyLogo"
                className="hidden"
                accept="image/*,.pdf"
                onChange={handleLogoChange}
              />
            </label>
          </div>

          {/* Company Name */}
          <div>
            <label
              htmlFor="companyName"
              className="block font-medium mb-2"
              style={{ color: "var(--color-grayish)" }}
            >
              Company Name
            </label>
            <input
              type="text"
              id="companyName"
              name="name"
              value={formData.name}
              placeholder="ABC Education Consultancy"
              onChange={handleTextChange}
              className="w-full bg-white rounded-lg h-14 p-4 border border-gray-300 placeholder-gray-300"
            />
          </div>

          {/* PAN */}
          <div className="flex flex-col">
            <label
              htmlFor="panNo"
              className="block font-medium mb-2"
              style={{ color: "var(--color-grayish)" }}
            >
              Pan No / VAT No
            </label>
            <input
              type="text"
              id="panNo"
              name="panNo"
              value={formData.panNo}
              placeholder="Please enter your PAN number"
              onChange={handleTextChange}
              className="w-full bg-white rounded-lg h-14 p-4 border border-gray-300 placeholder-gray-300"
            />
          </div>

          {/* Location */}
          <div className="flex flex-col">
            <label
              htmlFor="companyLocation"
              className="block font-medium mb-2"
              style={{ color: "var(--color-grayish)" }}
            >
              Company Location
            </label>
            <input
              type="text"
              id="companyLocation"
              name="companyLocation"
              value={formData.companyLocation}
              placeholder="Kathmandu, Nepal"
              onChange={handleTextChange}
              className="w-full bg-white rounded-lg h-14 p-4 border border-gray-300 placeholder-gray-300"
            />
          </div>

          {/* Document */}
          <div className="flex flex-col">
            <label
              className="block font-medium mb-2"
              htmlFor="companyDocument"
              style={{ color: "var(--color-grayish)" }}
            >
              Company Registration Document
            </label>

            <label className="bg-white rounded-lg border border-gray-300 p-4 text-center font-medium cursor-pointer">
              <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
                {formData.companyDocument?.name ?? "Upload"}
              </span>
              <input
                type="file"
                id="companyDocument"
                name="companyDocument"
                className="hidden"
                accept="image/*,.pdf"
                onChange={handleDocChange}
              />
            </label>
          </div>

          {/* Contact */}
          <div className="flex flex-col">
            <label
              className="block font-medium mb-2"
              htmlFor="contactNumber"
              style={{ color: "var(--color-grayish)" }}
            >
              Contact Number
            </label>

            <InputNumber
              id="contactNumber"
              placeholder="0159231632"
              value={formData.contactNumber}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, contactNumber: value }))
              }
              style={{ width: "100%", height: "3.5rem" }}
              controls={false}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col md:col-span-3">
            <label
              className="block font-medium mb-2"
              htmlFor="companyDescription"
              style={{ color: "var(--color-grayish)" }}
            >
              Company description
            </label>
            <textarea
              id="companyDescription"
              name="companyDescription"
              value={formData.companyDescription}
              onChange={handleTextChange}
              placeholder="Describe your company in a few sentences"
              className="w-full bg-white rounded-lg p-4 border border-gray-300 placeholder-gray-300"
            />
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button
            type="submit"
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-300"
          >
            Submit
          </button>
        </div>
      </form>
    </section>
  );
};

export default BasicInformation;
