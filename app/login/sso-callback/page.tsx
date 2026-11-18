import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SSOCallbackPage() {
  return (
    <Suspense>
      <AuthenticateWithRedirectCallback />
    </Suspense>
  );
}
