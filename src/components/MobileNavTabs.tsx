"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FileText, Compass, Briefcase } from "lucide-react";

export default function MobileNavTabs() {
  const pathname = usePathname();

  // Hide on homepage or auth pages if desired, or show on main feature routes
  const mainRoutes = ["/academic", "/study-hub", "/pyqs", "/discoveries", "/jobs"];
  const isMainRoute = mainRoutes.some((route) => pathname.startsWith(route));

  if (!isMainRoute) return null;

  const tabs = [
    { name: "Academic", path: "/academic", icon: BookOpen, matchPaths: ["/academic", "/study-hub"] },
    { name: "PYQs", path: "/pyqs", icon: FileText, matchPaths: ["/pyqs"] },
    { name: "Discoveries", path: "/discoveries", icon: Compass, matchPaths: ["/discoveries"] },
    { name: "Jobs", path: "/jobs", icon: Briefcase, matchPaths: ["/jobs"] },
  ];

  return (
    <div className="mobileNavTabsWrap">
      <style>{`
        .mobileNavTabsWrap {
          display: none;
        }
        @media (max-width: 850px) {
          .mobileNavTabsWrap {
            display: flex;
            position: sticky;
            top: 64px;
            z-index: 90;
            width: 100%;
            padding: 8px 12px;
            background: rgba(2, 12, 27, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(56, 211, 153, 0.15);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
          }
          .mobileNavTabsGrid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            width: 100%;
          }
          .mobileNavTabBtn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            padding: 8px 4px;
            border-radius: 12px;
            text-decoration: none;
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.72rem;
            font-weight: 600;
            font-family: Inter, system-ui, sans-serif;
            transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
            background: transparent;
            border: 1px solid transparent;
          }
          .mobileNavTabBtn.active {
            color: #38d399;
            background: linear-gradient(135deg, rgba(56, 211, 153, 0.18), rgba(16, 185, 129, 0.08));
            border-color: rgba(56, 211, 153, 0.35);
            box-shadow: 0 4px 14px rgba(56, 211, 153, 0.15);
            font-weight: 700;
          }
          .mobileNavTabIcon {
            transition: transform 0.2s ease;
          }
          .mobileNavTabBtn.active .mobileNavTabIcon {
            transform: scale(1.1);
          }
        }
      `}</style>

      <div className="mobileNavTabsGrid">
        {tabs.map((tab) => {
          const isActive = tab.matchPaths.some((p) => pathname.startsWith(p));
          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={tab.path}
              className={`mobileNavTabBtn ${isActive ? "active" : ""}`}
            >
              <Icon size={18} className="mobileNavTabIcon" />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
