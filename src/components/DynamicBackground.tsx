/**
 * DynamicBackground.tsx
 * ─────────────────────────────────────────────────────────────
 * Renders a GPU-accelerated, subject-adaptive animated background.
 * Sits at fixed inset-0 z-[-1] — NEVER re-renders the parent app.
 *
 * Themes:
 *   "tech"  → Cyber/OS/Security  — cyan circuit grid + binary rain
 *   "soft"  → Soft-Skills/HR     — aurora blob orbs (Apple-style)
 *   "math"  → Math/Data/Science  — constellation particle network
 *   "default"→ Any other topic   — breathing dark gradient mesh
 * ─────────────────────────────────────────────────────────────
 */
"use client";

import React, { useMemo, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────── Theme Detection ─────────────────────── */
type ThemeKey = "tech" | "soft" | "math" | "default";

const TECH_KEYWORDS = [
  "operating system", "os", "cyber", "security", "network", "computer",
  "programming", "software", "hardware", "algorithm", "database", "linux",
  "windows", "cloud", "devops", "machine learning", "ai", "artificial",
  "web", "api", "code", "coding", "javascript", "python", "java",
];

const SOFT_KEYWORDS = [
  "soft skill", "communication", "leadership", "teamwork", "management",
  "interpersonal", "emotional", "presentation", "interview", "resume",
  "career", "attitude", "behaviour", "personality", "time management",
  "negotiation", "conflict", "motivation", "creativity", "ethics",
];

const MATH_KEYWORDS = [
  "math", "mathematics", "calculus", "algebra", "geometry", "statistics",
  "probability", "data", "analytics", "linear", "differential", "integral",
  "matrix", "vector", "graph", "numerical", "discrete", "logic", "set theory",
  "trigonometry", "physics", "chemistry", "engineering",
];

export function detectTheme(subjectName: string): ThemeKey {
  const lower = subjectName.toLowerCase();
  if (TECH_KEYWORDS.some((k) => lower.includes(k))) return "tech";
  if (SOFT_KEYWORDS.some((k) => lower.includes(k))) return "soft";
  if (MATH_KEYWORDS.some((k) => lower.includes(k))) return "math";
  return "default";
}

/* ─────────────────────── Constellation Canvas (Math) ─────────────────────── */
const ConstellationCanvas = memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    // Nodes
    const NODE_COUNT = Math.min(70, Math.floor((W * H) / 18000));
    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 2.5 + 1,
    }));

    const MAX_DIST = 160;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Move nodes
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      }

      // Draw edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.35;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(156, 39, 176, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(200, 130, 255, 0.7)";
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.6,
      }}
    />
  );
});
ConstellationCanvas.displayName = "ConstellationCanvas";

/* ─────────────────────── Binary Rain Canvas (Tech) ─────────────────────── */
const BinaryRainCanvas = memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const FONT_SIZE = 13;
    const cols = Math.floor(canvas.width / FONT_SIZE);
    const drops: number[] = Array(cols).fill(1);
    const chars = "01アイウエオカキクケコ".split("");

    const draw = () => {
      // Dark trail fade
      ctx.fillStyle = "rgba(10, 17, 40, 0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${FONT_SIZE}px 'JetBrains Mono', monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const y = drops[i] * FONT_SIZE;

        // Head glyph — bright cyan
        ctx.fillStyle = `rgba(0, 240, 255, ${Math.random() * 0.5 + 0.3})`;
        ctx.fillText(char, i * FONT_SIZE, y);

        // Reset drop randomly
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.18,
      }}
    />
  );
});
BinaryRainCanvas.displayName = "BinaryRainCanvas";

/* ─────────────────────── Theme Renderers ─────────────────────── */

/** TECH: Deep midnight blue + cyan circuit grid + binary rain */
const TechBackground = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background:
        "radial-gradient(ellipse at 20% 30%, #001a3a 0%, #0a1128 60%, #000d1f 100%)",
      overflow: "hidden",
    }}
  >
    {/* Binary rain */}
    <BinaryRainCanvas />

    {/* SVG circuit-grid overlay */}
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.08 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="circuit" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#00f0ff" strokeWidth="0.4" />
          <circle cx="0" cy="0" r="2" fill="#00f0ff" opacity="0.6" />
          <circle cx="80" cy="0" r="1.5" fill="#00f0ff" opacity="0.4" />
          <circle cx="0" cy="80" r="1.5" fill="#00f0ff" opacity="0.4" />
          <line x1="40" y1="0" x2="40" y2="20" stroke="#00f0ff" strokeWidth="0.3" />
          <line x1="0" y1="40" x2="20" y2="40" stroke="#00f0ff" strokeWidth="0.3" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#circuit)" />
    </svg>

    {/* Pulsing neon orbs */}
    {[
      { cx: "10%", cy: "20%", r: 200, color: "rgba(0,240,255,0.06)" },
      { cx: "90%", cy: "80%", r: 260, color: "rgba(16,185,129,0.05)" },
      { cx: "50%", cy: "50%", r: 180, color: "rgba(0,240,255,0.03)" },
    ].map((orb, i) => (
      <motion.div
        key={i}
        style={{
          position: "absolute",
          left: orb.cx,
          top: orb.cy,
          width: orb.r * 2,
          height: orb.r * 2,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
          transform: "translate(-50%, -50%)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 5 + i * 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.8 }}
      />
    ))}
  </div>
);

/** SOFT SKILLS: Aurora blob orbs — warm peach, lavender, dawn blue */
const SoftBackground = () => {
  const blobs = useMemo(() => [
    { color: "rgba(255,209,179,0.25)", x: "15%", y: "25%", size: 420, dur: 14, delay: 0 },
    { color: "rgba(209,196,233,0.22)", x: "75%", y: "20%", size: 380, dur: 18, delay: 2 },
    { color: "rgba(144,202,249,0.18)", x: "50%", y: "70%", size: 460, dur: 20, delay: 4 },
    { color: "rgba(255,182,193,0.15)", x: "85%", y: "60%", size: 300, dur: 16, delay: 1 },
    { color: "rgba(187,222,251,0.12)", x: "25%", y: "75%", size: 340, dur: 22, delay: 3 },
  ], []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(135deg, #1a0a2e 0%, #0d1a2e 50%, #1a1228 100%)",
        overflow: "hidden",
      }}
    >
      {blobs.map((blob, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            left: blob.x,
            top: blob.y,
            width: blob.size,
            height: blob.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${blob.color}, transparent 65%)`,
            transform: "translate(-50%, -50%)",
            filter: "blur(40px)",
            willChange: "transform, opacity",
          }}
          animate={{
            x: [0, 40, -30, 20, 0],
            y: [0, -30, 20, -15, 0],
            scale: [1, 1.12, 0.92, 1.06, 1],
            opacity: [0.7, 1, 0.8, 0.95, 0.7],
          }}
          transition={{
            duration: blob.dur,
            repeat: Infinity,
            ease: "easeInOut",
            delay: blob.delay,
          }}
        />
      ))}

      {/* Subtle star dust */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.08) 0%, transparent 100%), " +
            "radial-gradient(1px 1px at 60% 70%, rgba(255,255,255,0.06) 0%, transparent 100%), " +
            "radial-gradient(1px 1px at 80% 15%, rgba(255,255,255,0.07) 0%, transparent 100%)",
        }}
      />
    </div>
  );
};

/** MATH: Dark slate + purple constellation particles */
const MathBackground = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background:
        "radial-gradient(ellipse at 60% 40%, #1a0a2e 0%, #1c2526 50%, #0e1517 100%)",
      overflow: "hidden",
    }}
  >
    <ConstellationCanvas />

    {/* Floating geometric shapes */}
    {[
      { shape: "triangle", x: "8%", y: "15%", size: 40, color: "rgba(156,39,176,0.15)", rot: 0 },
      { shape: "square", x: "88%", y: "25%", size: 30, color: "rgba(200,130,255,0.12)", rot: 45 },
      { shape: "triangle", x: "75%", y: "78%", size: 50, color: "rgba(156,39,176,0.1)", rot: 180 },
      { shape: "square", x: "15%", y: "75%", size: 35, color: "rgba(200,130,255,0.1)", rot: 20 },
      { shape: "triangle", x: "50%", y: "10%", size: 28, color: "rgba(156,39,176,0.12)", rot: 60 },
    ].map((geo, i) => (
      <motion.div
        key={i}
        style={{
          position: "absolute",
          left: geo.x,
          top: geo.y,
          width: geo.size,
          height: geo.size,
          border: `1px solid ${geo.color}`,
          borderRadius: geo.shape === "square" ? 4 : 0,
          clipPath: geo.shape === "triangle" ? "polygon(50% 0%, 0% 100%, 100% 100%)" : undefined,
          background: geo.shape === "triangle" ? geo.color : "transparent",
          willChange: "transform, opacity",
        }}
        animate={{
          rotate: [geo.rot, geo.rot + 360],
          opacity: [0.4, 0.9, 0.4],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 18 + i * 4,
          repeat: Infinity,
          ease: "linear",
          delay: i * 1.2,
        }}
      />
    ))}

    {/* Purple glow orbs */}
    <motion.div
      style={{
        position: "absolute", left: "30%", top: "30%",
        width: 350, height: 350, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(156,39,176,0.08), transparent 70%)",
        transform: "translate(-50%, -50%)", filter: "blur(20px)",
      }}
      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

/** DEFAULT: Breathing dark gradient mesh */
const DefaultBackground = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: "radial-gradient(ellipse at center, #111111 0%, #000000 100%)",
      overflow: "hidden",
    }}
  >
    {/* Breathing mesh */}
    <motion.div
      style={{
        position: "absolute",
        inset: "-20%",
        background:
          "radial-gradient(ellipse at 30% 40%, rgba(56,211,153,0.04) 0%, transparent 50%), " +
          "radial-gradient(ellipse at 70% 60%, rgba(96,165,250,0.03) 0%, transparent 50%)",
        willChange: "transform, opacity",
      }}
      animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />

    {/* Subtle grid */}
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="grid-default" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-default)" />
    </svg>
  </div>
);

/* ─────────────────────── Theme Config ─────────────────────── */
const THEME_MAP: Record<ThemeKey, { component: React.ReactNode; overlay: string }> = {
  tech: {
    component: <TechBackground />,
    overlay:
      "linear-gradient(to bottom, rgba(10,17,40,0.82) 0%, rgba(10,17,40,0.72) 100%)",
  },
  soft: {
    component: <SoftBackground />,
    overlay:
      "linear-gradient(to bottom, rgba(26,10,46,0.80) 0%, rgba(13,26,46,0.75) 100%)",
  },
  math: {
    component: <MathBackground />,
    overlay:
      "linear-gradient(to bottom, rgba(28,37,38,0.82) 0%, rgba(14,21,23,0.75) 100%)",
  },
  default: {
    component: <DefaultBackground />,
    overlay:
      "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(5,5,10,0.80) 100%)",
  },
};

/* ─────────────────────── Main Export ─────────────────────── */
interface DynamicBackgroundProps {
  /** The full subject / topic name from lesson data */
  subjectName: string;
}

/**
 * DynamicBackground
 *
 * Renders the correct animated background based on subject keywords.
 * Positioned as fixed inset-0 z-[-1], does NOT affect layout.
 * Uses AnimatePresence for buttery cross-fade when theme changes.
 */
export const DynamicBackground = memo(({ subjectName }: DynamicBackgroundProps) => {
  const theme = useMemo(() => detectTheme(subjectName), [subjectName]);
  const { component, overlay } = THEME_MAP[theme];

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        overflow: "hidden",
        /* Hardware acceleration */
        willChange: "auto",
        isolation: "isolate",
      }}
    >
      {/* Animated background layer — cross-fades on theme change */}
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          style={{ position: "absolute", inset: 0 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        >
          {component}
        </motion.div>
      </AnimatePresence>

      {/* Readability overlay — always on top of the animation */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: overlay,
          backdropFilter: "blur(0px)", // can increase if needed
          zIndex: 1,
        }}
      />
    </div>
  );
});
DynamicBackground.displayName = "DynamicBackground";
