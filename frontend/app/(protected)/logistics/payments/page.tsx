import { Suspense } from "react";
import EsewaVerifyContent from "@/components/shared/payment/esewa/EsewaVerifyPage";

export default function EsewaVerifyPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <EsewaVerifyContent />
    </Suspense>
  );
}
