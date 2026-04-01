
import { Suspense } from "react";
import KhaltiVerifyContent from "@/components/shared/payment/khalti/KhaltiVerifyPage";

export default function KhaltiVerifyPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <KhaltiVerifyContent />
    </Suspense>
  );
}