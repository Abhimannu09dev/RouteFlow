import CreatePassword from "@/components/auth/CreatePassword";
import { Suspense } from "react";

const UpdatePassword = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreatePassword />
    </Suspense>
  );
};

export default UpdatePassword;
