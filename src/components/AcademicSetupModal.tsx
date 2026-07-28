"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCache, setCache } from "@/lib/cache";

/* ─── Types ─── */
type University = { university_id: string; university_name: string };
type Branch = { branch_id: string; university_id: string | null; branch_name: string; branch_code: string | null };

export interface AcademicSelection {
  universityId: string;
  branchId: string;
  semester: number;
  universityName: string;
  branchName: string;
}

interface Props {
  userId: string;
  onComplete: (selection: AcademicSelection) => void;
}

/* ─── Premium Inline Select ─── */
function InlineSelect({
  placeholder,
  value,
  options,
  disabled,
  onChange,
}: {
  placeholder: string;
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  // Scroll selected item into view when opening
  useEffect(() => {
    if (open && listRef.current && value) {
      const el = listRef.current.querySelector(`[data-value="${value}"]`);
      if (el) (el as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }, [open, value]);

  return (
    <div ref={ref} style={{ position: "relative", userSelect: "none" }}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          background: open ? "rgba(56,211,153,0.08)" : "rgba(255,255,255,0.04)",
          border: `1.5px solid ${open ? "rgba(56,211,153,0.5)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: open ? "14px 14px 0 0" : 14,
          color: selected ? "#f1f5f9" : "#64748b",
          fontSize: "0.92rem",
          fontWeight: selected ? 600 : 400,
          cursor: disabled ? "not-allowed" : "pointer",
          fontFamily: "Inter, system-ui, sans-serif",
          transition: "background 0.2s, border-color 0.2s",
          outline: "none",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "calc(100% - 28px)" }}>
          {disabled ? "Loading..." : (selected?.label || placeholder)}
        </span>
        <svg
          width={18} height={18} viewBox="0 0 24 24" fill="none"
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease", color: "#38d399" }}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div
          ref={listRef}
          style={{
            position: "relative",
            width: "100%",
            maxHeight: 200,
            overflowY: "auto",
            background: "#041830",
            border: "1.5px solid rgba(56,211,153,0.4)",
            borderTop: "none",
            borderRadius: "0 0 14px 14px",
            WebkitOverflowScrolling: "touch" as any,
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: "16px", color: "#64748b", fontSize: "0.85rem", textAlign: "center" }}>No options available</div>
          ) : options.map(opt => (
            <button
              key={opt.value}
              data-value={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                width: "100%",
                padding: "13px 18px",
                display: "block",
                textAlign: "left",
                background: opt.value === value ? "rgba(56,211,153,0.12)" : "transparent",
                border: "none",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                color: opt.value === value ? "#38d399" : "#cbd5e1",
                fontSize: "0.88rem",
                fontWeight: opt.value === value ? 700 : 400,
                cursor: "pointer",
                fontFamily: "Inter, system-ui, sans-serif",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { if (opt.value !== value) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { if (opt.value !== value) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Step Dot ─── */
function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: "0.82rem",
      background: done ? "linear-gradient(135deg,#10b981,#059669)" : active ? "rgba(56,211,153,0.12)" : "rgba(255,255,255,0.04)",
      border: done ? "none" : active ? "2px solid #38d399" : "2px solid rgba(255,255,255,0.1)",
      color: done ? "#fff" : active ? "#38d399" : "#475569",
      transition: "all 0.3s ease",
      boxShadow: done ? "0 4px 14px rgba(16,185,129,0.4)" : active ? "0 0 14px rgba(56,211,153,0.25)" : "none",
      flexShrink: 0,
    }}>
      {done ? "✓" : label}
    </div>
  );
}

/* ─── Main Modal ─── */
export default function AcademicSetupModal({ userId, onComplete }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState(1);
  const [universities, setUniversities] = useState<University[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedUniversityId, setSelectedUniversityId] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [loadingUniversities, setLoadingUniversities] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const cacheKey = "academic_universities";
      const cached = getCache<University[]>(cacheKey);
      if (cached) { setUniversities(cached); setLoadingUniversities(false); return; }
      const { data, error } = await supabase.from("universities").select("university_id, university_name").order("university_name", { ascending: true });
      if (!error && data) { setUniversities(data); setCache(cacheKey, data); }
      setLoadingUniversities(false);
    }
    load();
  }, [supabase]);

  useEffect(() => {
    if (!selectedUniversityId) { setBranches([]); return; }
    async function load() {
      setLoadingBranches(true);
      const cacheKey = `academic_branches_${selectedUniversityId}`;
      const cached = getCache<Branch[]>(cacheKey);
      if (cached) { setBranches(cached); setLoadingBranches(false); return; }
      const { data, error } = await supabase.from("branches").select("branch_id, university_id, branch_name, branch_code").eq("university_id", selectedUniversityId).order("branch_name", { ascending: true });
      if (!error && data) { setBranches(data); setCache(cacheKey, data); }
      setLoadingBranches(false);
    }
    load();
  }, [selectedUniversityId, supabase]);

  const filteredBranches = branches.filter(b => b.university_id === selectedUniversityId);
  const uniName = universities.find(u => u.university_id === selectedUniversityId)?.university_name || "";
  const branchName = branches.find(b => b.branch_id === selectedBranchId)?.branch_name || "";

  const handleNext = () => {
    setError("");
    if (step === 1) { if (!selectedUniversityId) { setError("Please select your university."); return; } setStep(2); }
    else if (step === 2) { if (!selectedBranchId) { setError("Please select your branch."); return; } setStep(3); }
  };

  const handleSubmit = async () => {
    if (!selectedSemester) { setError("Please select your semester."); return; }
    if (!selectedUniversityId || !selectedBranchId) return;
    setSaving(true); setError("");
    try {
      const { error: updateError } = await supabase.from("users").update({ university_id: selectedUniversityId, branch_id: selectedBranchId, semester: selectedSemester }).eq("user_id", userId);
      if (updateError) throw updateError;
      onComplete({ universityId: selectedUniversityId, branchId: selectedBranchId, semester: selectedSemester, universityName: uniName, branchName });
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const stepMeta = [
    { label: "1", title: "University", subtitle: "Which university do you attend?" },
    { label: "2", title: "Branch", subtitle: "What's your branch of study?" },
    { label: "3", title: "Semester", subtitle: "Which semester are you currently in?" },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(2,12,27,0.9)",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <style>{`
        @keyframes acadFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes acadSlideUp { from { opacity:0; transform:translateY(20px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes acadStepIn { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }
        .acad-select-list::-webkit-scrollbar { width: 4px; }
        .acad-select-list::-webkit-scrollbar-thumb { background: rgba(56,211,153,0.3); border-radius: 99px; }
      `}</style>

      {/* Modal Card */}
      <div style={{
        width: "100%", maxWidth: 460,
        background: "linear-gradient(160deg, #051628 0%, #020c18 100%)",
        border: "1px solid rgba(56,211,153,0.2)",
        borderRadius: 22,
        padding: "32px 28px",
        boxShadow: "0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(56,211,153,0.06)",
        animation: "acadSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
        position: "relative",
        overflow: "hidden",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* Glow */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,211,153,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24, flexShrink: 0 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", margin: "0 auto 14px", boxShadow: "0 8px 20px rgba(16,185,129,0.35)" }}>🎓</div>
          <h2 style={{ margin: "0 0 5px", fontSize: "1.35rem", fontWeight: 800, background: "linear-gradient(135deg,#fff,#38d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em" }}>
            Academic Setup
          </h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.83rem" }}>Tell us about yourself to personalize your experience</p>
        </div>

        {/* Step Progress */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 28, flexShrink: 0 }}>
          {[1, 2, 3].map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <StepDot label={String(s)} active={step === s} done={step > s} />
              {i < 2 && (
                <div style={{ width: 40, height: 2, borderRadius: 2, background: step > s + 1 ? "linear-gradient(90deg,#10b981,#059669)" : step > s ? "rgba(56,211,153,0.4)" : "rgba(255,255,255,0.07)", transition: "background 0.4s ease" }} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content — scrollable */}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" as any, minHeight: 0 }}>
          <div key={step} style={{ animation: "acadStepIn 0.28s ease" }}>
            {/* Labels */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: "0 0 3px", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#38d399" }}>Step {step} of 3</p>
              <h3 style={{ margin: "0 0 2px", fontSize: "1.05rem", fontWeight: 700, color: "#f1f5f9" }}>{stepMeta[step - 1].title}</h3>
              <p style={{ margin: "0 0 16px", fontSize: "0.82rem", color: "#64748b" }}>{stepMeta[step - 1].subtitle}</p>
            </div>

            {/* Step 1 — University */}
            {step === 1 && (
              <InlineSelect
                placeholder={loadingUniversities ? "Loading universities..." : "Select your university"}
                value={selectedUniversityId || ""}
                disabled={loadingUniversities}
                options={universities.map(u => ({ value: u.university_id, label: u.university_name }))}
                onChange={v => { setSelectedUniversityId(v || null); setSelectedBranchId(null); setError(""); }}
              />
            )}

            {/* Step 2 — Branch */}
            {step === 2 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10, marginBottom: 14, background: "rgba(56,211,153,0.06)", border: "1px solid rgba(56,211,153,0.15)" }}>
                  <span style={{ fontSize: "0.75rem", color: "#38d399", fontWeight: 600 }}>🏛️ {uniName}</span>
                </div>
                <InlineSelect
                  placeholder={loadingBranches ? "Loading branches..." : "Select your branch"}
                  value={selectedBranchId || ""}
                  disabled={loadingBranches}
                  options={filteredBranches.map(b => ({ value: b.branch_id, label: `${b.branch_name}${b.branch_code ? ` (${b.branch_code})` : ""}` }))}
                  onChange={v => { setSelectedBranchId(v || null); setError(""); }}
                />
              </>
            )}

            {/* Step 3 — Semester */}
            {step === 3 && (
              <>
                <div style={{ display: "flex", gap: 7, marginBottom: 16, flexWrap: "wrap" }}>
                  {[{ icon: "🏛️", text: uniName }, { icon: "📚", text: branchName }].map((pill, i) => (
                    <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 100, background: "rgba(56,211,153,0.06)", border: "1px solid rgba(56,211,153,0.15)", fontSize: "0.72rem", color: "#38d399", fontWeight: 600 }}>
                      {pill.icon} {pill.text}
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {[1,2,3,4,5,6,7,8].map(sem => (
                    <button
                      key={sem}
                      onClick={() => { setSelectedSemester(sem); setError(""); }}
                      style={{
                        padding: "14px 8px", borderRadius: 12,
                        border: `2px solid ${selectedSemester === sem ? "#38d399" : "rgba(255,255,255,0.08)"}`,
                        background: selectedSemester === sem ? "rgba(56,211,153,0.12)" : "rgba(255,255,255,0.02)",
                        color: selectedSemester === sem ? "#38d399" : "#64748b",
                        fontWeight: selectedSemester === sem ? 700 : 500,
                        fontSize: "0.85rem", cursor: "pointer",
                        transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                        transform: selectedSemester === sem ? "scale(1.06)" : "scale(1)",
                        boxShadow: selectedSemester === sem ? "0 0 14px rgba(56,211,153,0.25)" : "none",
                        fontFamily: "Inter, sans-serif",
                        outline: "none",
                      }}
                    >
                      Sem {sem}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p style={{ marginTop: 10, fontSize: "0.8rem", color: "#ef4444", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            ⚠️ {error}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 20, flexShrink: 0 }}>
          {step > 1 && (
            <button
              onClick={() => { setStep(s => s - 1); setError(""); }}
              style={{
                flex: 1, padding: "14px",
                borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)", color: "#94a3b8",
                fontWeight: 600, fontSize: "0.875rem", cursor: "pointer",
                fontFamily: "Inter, sans-serif", transition: "all 0.2s", outline: "none",
              }}
            >
              ← Back
            </button>
          )}
          <button
            onClick={step < 3 ? handleNext : handleSubmit}
            disabled={saving}
            style={{
              flex: 2, padding: "14px",
              borderRadius: 12, border: "none",
              background: saving ? "rgba(56,211,153,0.3)" : "linear-gradient(135deg,#10b981,#059669)",
              color: "#fff",
              fontWeight: 700, fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "Inter, sans-serif",
              boxShadow: "0 4px 18px rgba(16,185,129,0.35)",
              transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
              outline: "none",
            }}
          >
            {saving ? "Saving…" : step < 3 ? "Next →" : "🚀 Enter Study Hub"}
          </button>
        </div>
      </div>
    </div>
  );
}
