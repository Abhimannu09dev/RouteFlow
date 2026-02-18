import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthPage";

const Auth = async ({ searchParams }: { searchParams: { action: string } }) => {
  const { action } = await searchParams;

  return (
    <Suspense>
      <AuthForm action={action} />
    </Suspense>
  );
};

export default Auth;
