"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import "@/styles/SplashLoader.css";

export default function SplashLoader() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show on the very first time the user visits in this session
    const hasVisited = sessionStorage.getItem("splash_shown");
    if (!hasVisited) {
      setShow(true);
      sessionStorage.setItem("splash_shown", "1");
      
      // Physically remove it from the DOM after the animation completes (3s total)
      const timer = setTimeout(() => {
        setShow(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="splash-loader-container">
      <div className="splash-loader-content">
        <Image 
          src="/logo.png" 
          alt="ClimbUP Logo" 
          width={140} 
          height={140} 
          className="splash-logo" 
          priority 
        />
        <div className="splash-loading-bar">
          <div className="splash-loading-progress" />
        </div>
      </div>
    </div>
  );
}
