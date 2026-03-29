"use client";
import "@/lib/i18n"; // side-effect import — initializes i18next

export default function I18nProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // i18n is initialized by the import above.
  // This wrapper ensures it only runs client-side (Next.js App Router).
  return <>{children}</>;
}
