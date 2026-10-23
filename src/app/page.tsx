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
      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", minHeight: "100vh", backgroundColor: "#f4f8fc" }}
    >
      <div style={{ width: "42px", height: "42px", border: "3.5px solid rgba(37, 99, 235, 0.15)", borderTopColor: "#2563eb", borderRightColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.85s linear infinite", willChange: "transform" }} />
    </div>
  ),
});

const HomeSections = dynamic(() => import("@/components/HomeSections"), {
  ssr: false,
  loading: () => <div className="w-full bg-[#f4f8fc]" style={{ minHeight: "60vh" }} />,
});

export default function Page() {
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (currentUser) {
      router.prefetch("/my-courses");
      router.prefetch("/courses");
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
