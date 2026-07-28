import dynamic from "next/dynamic";
import Footer from "@/components/Footer";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

const HeroSection = dynamic(() => import("@/components/HeroSection"), {
  ssr: false,
  loading: () => <div className="skeleton h-96 w-full" />,
});

const HomeSections = dynamic(() => import("@/components/HomeSections"), {
  ssr: false,
  loading: () => <div className="skeleton h-64 w-full" />,
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
