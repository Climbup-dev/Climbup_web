"use client";

import dynamic from "next/dynamic";
import Footer from "@/components/Footer";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

const HeroSection = dynamic(() => import("@/components/HeroSection"), {
  ssr: false,
  loading: () => (
    <div 
      className="w-full flex items-center justify-center bg-[#021526]" 
      style={{ minHeight: '100vh' }}
    >
      <div style={{ width: "40px", height: "40px", border: "3px solid rgba(56, 211, 153, 0.1)", borderTopColor: "#38d399", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    </div>
  ),
});

const HomeSections = dynamic(() => import("@/components/HomeSections"), {
  ssr: false,
  loading: () => <div className="w-full bg-[#021526]" style={{ minHeight: '100vh' }} />,
});

export default function Page() {
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (currentUser) {
      // Prefetch academic page for instant navigation after login
      router.prefetch("/academic");
    }
  }, [currentUser, router]);

  return (
    <main>
      <HeroSection />
      <HomeSections />
      <Footer />
    </main>
  );
}
