/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { EyeFreeIcons, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { toast } from "react-toastify";

const AuthForm = ({ action }: { action: string | null }) => {
  const router = useRouter();

  const actions = [
    {
      label: "Welcome back",
      description: "Sign in to continue your journey",
      value: "sign-in",
      endpoint: "/auth/signin",
      redirect: "/dashboard",
      inputs: [
        {
          label: "Email",
          type: "email",
          name: "email",
          placeholder: "Enter your email",
        },
        {
          label: "Password",
          type: "password",
          name: "password",
          placeholder: "Enter your password",
        },
      ],
    },
    {
      label: "Create account",
      description: "Let's get you started on your delivery journey 🚚",
      value: "sign-up",
      endpoint: "/auth/signup",
      redirect: "/auth?action=sign-in",
      inputs: [
        {
          label: "Email",
          type: "email",
          name: "email",
          placeholder: "Enter your email",
        },
        {
          label: "Role",
          type: "select",
          name: "role",
          placeholder: "Select your role",
          options: ["Logistic Company", "Manufacturer"],
        },
        {
          label: "Password",
          type: "password",
          name: "password",
          placeholder: "Enter your password",
        },
        {
          label: "Confirm Password",
          type: "password",
          name: "confirmPassword",
          placeholder: "Confirm your password",
        },
      ],
    },
  ];

  const [authType, setAuthType] = useState<string>(actions[0].value);

  const [formData, setFormData] = useState<{
    email: string;
    password: string;
    role?: string;
    confirmPassword?: string;
  }>({
    email: "",
    password: "",
    role: "",
  });

  useEffect(() => {
    if (action === "sign-in") {
      setAuthType("sign-in");
    } else if (action === "sign-up") {
      setAuthType("sign-up");
    } else {
      router.push("/auth?action=sign-in");
    }
  }, [action, router]);

  const [isPasswordShown, setIsPasswordShown] = useState<boolean>(false);
  const [isConfirmPasswordShown, setIsConfirmPasswordShown] =
    useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (authType === "sign-up" && !formData.role) {
      toast.error("Please select a role");
      return;
    }

    console.log(formData);
  };

  return (
    <div className="w-full flex flex-col items-center gap-1">
      <p className="text-lg font-medium">
        {actions.find((a) => a.value === authType)?.label}
      </p>
      <p className="text-blackish text-sm">
        {actions.find((a) => a.value === authType)?.description}
      </p>

      <div className="w-full bg-[#F5F5F5] my-5 p-1.5 rounded-lg flex">
        {actions.map((a, index) => (
          <Link
            key={index}
            href={`/auth?action=${a.value}`}
            className={`w-1/2 p-2 rounded-md flex items-center justify-center text-sm font-medium ${
              a.value === authType ? "bg-white" : ""
            }`}
          >
            {a.label}
          </Link>
        ))}
      </div>

      <form
        className="w-full flex flex-col items-center gap-4 text-sm"
        onSubmit={handleSubmit}
      >
        {actions
          .find((a) => a.value === authType)
          ?.inputs.map((input, index) => (
            <div key={index} className="flex flex-col gap-0.5 w-full">
              <label className="text-grayish">{input.label}</label>

              {input.type === "select" ? (
                <select
                  name={input.name}
                  value={formData[input.name as keyof typeof formData] || ""}
                  onChange={handleSelectChange}
                  className="w-full p-3 rounded-md bg-[#F5F5F5]"
                >
                  <option value="" disabled>
                    Select your role
                  </option>
                  {input.options?.map((option: string) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full relative">
                  <input
                    type={
                      input.name === "password"
                        ? isPasswordShown
                          ? "text"
                          : "password"
                        : input.name === "confirmPassword"
                        ? isConfirmPasswordShown
                          ? "text"
                          : "password"
                        : input.type
                    }
                    name={input.name}
                    value={formData[input.name as keyof typeof formData] || ""}
                    onChange={handleChange}
                    placeholder={input.placeholder}
                    className="w-full p-3 rounded-md bg-[#F5F5F5]"
                  />

                  {input.type === "password" && (
                    <HugeiconsIcon
                      icon={
                        input.name === "password"
                          ? isPasswordShown
                            ? ViewOffSlashIcon
                            : EyeFreeIcons
                          : isConfirmPasswordShown
                          ? ViewOffSlashIcon
                          : EyeFreeIcons
                      }
                      className="w-4 h-4 text-grayish absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                      onClick={() =>
                        input.name === "password"
                          ? setIsPasswordShown(!isPasswordShown)
                          : setIsConfirmPasswordShown(!isConfirmPasswordShown)
                      }
                    />
                  )}
                </div>
              )}
            </div>
          ))}

        <div className="w-full flex justify-start">
          <Link
            href="/auth/forgot-password"
            className="text-[#c6c6c6] hover:text-[#606060] transition text-sm"
          >
            Forgot password
          </Link>
        </div>

        <button
          type="submit"
          className="w-full p-3 rounded-md bg-primary hover:bg-primary-dark transition-all text-white"
        >
          {actions.find((a) => a.value === authType)?.label}
        </button>
      </form>
    </div>
  );
};

export default AuthForm;
