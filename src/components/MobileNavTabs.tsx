"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, GraduationCap, User } from "lucide-react";

export default function MobileNavTabs() {
  const pathname = usePathname();

  const tabs = [
    { name: "Home", path: "/", icon: Home, matchPaths: ["/"] },
    { name: "Courses", path: "/courses", icon: BookOpen, matchPaths: ["/courses"] },
    { name: "My Learning", path: "/my-courses", icon: GraduationCap, matchPaths: ["/my-courses"] },
    { name: "Profile", path: "/profile", icon: User, matchPaths: ["/profile"] },
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
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 150;
            width: 100%;
            padding: 8px 12px;
            background: rgba(2, 21, 38, 0.95);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            border-top: 1px solid rgba(56, 211, 153, 0.2);
            box-shadow: 0 -4px 25px rgba(0, 0, 0, 0.5);
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
            padding: 6px 4px;
            border-radius: 12px;
            text-decoration: none;
            color: rgba(255, 255, 255, 0.65);
            font-size: 0.72rem;
            font-weight: 600;
            font-family: inherit;
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
          const isActive = tab.path === "/" 
            ? pathname === "/" 
            : tab.matchPaths.some((p) => pathname.startsWith(p));
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
