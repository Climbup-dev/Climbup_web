"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";

type EntryMode = "login" | "register";

const AuthModal = dynamic(() => import("@/components/AuthModal"), {
  ssr: false,
  loading: () => null,
});

export default function QuestionDetailFrame({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { passwordRecovery } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("login");

  const openAuth = (mode: EntryMode) => {
    setEntryMode(mode);
    setAuthOpen(true);
  };

  return (
    <div className="questionDetailFrame">
      <Navbar
        onLogin={() => openAuth("login")}
        onSignUp={() => openAuth("register")}
      />

      {children}

      <Footer />

      {(authOpen || passwordRecovery) && (
        <AuthModal
          key={entryMode}
          open={authOpen}
          initialMode={entryMode}
          onClose={() => setAuthOpen(false)}
        />
      )}
    </div>
  );
}
