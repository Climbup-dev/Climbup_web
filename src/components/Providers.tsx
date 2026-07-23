"use client";

import dynamic from "next/dynamic";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ToastProvider } from "@/hooks/useToast";
import type { AcademicSelection } from "@/components/AcademicSetupModal";

const AcademicSetupModal = dynamic(
  () => import("@/components/AcademicSetupModal"),
  { ssr: false, loading: () => null }
);

/* ── Inner gate — reads auth context ── */
function AcademicGate({ children }: { children: React.ReactNode }) {
  const { currentUser, loading, needsAcademicSetup, completeAcademicSetup } = useAuth();

  const handleComplete = (selection: AcademicSelection) => {
    completeAcademicSetup({
      university_id: selection.universityId,
      branch_id: selection.branchId,
      semester: selection.semester,
    });
  };

  return (
    <>
      {children}

      {/* Show Academic Setup Modal right after login if profile is incomplete */}
      {!loading && currentUser && needsAcademicSetup && (
        <AcademicSetupModal
          userId={currentUser.id}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <AcademicGate>
          {children}
        </AcademicGate>
      </AuthProvider>
    </ToastProvider>
  );
}
