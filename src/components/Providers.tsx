"use client";

import { AuthProvider } from "@/hooks/useAuth";
import { ToastProvider } from "@/hooks/useToast";
import SplashLoader from "@/components/SplashLoader";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <SplashLoader />
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}
