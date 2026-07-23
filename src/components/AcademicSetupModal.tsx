"use client";

import { useEffect, useMemo, useState } from "react";
import CustomSelect from "@/components/CustomSelect";
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

/* ─── Step Indicator ─── */
function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: "0.8rem",
        background: done ? "linear-gradient(135deg,#10b981,#059669)"
          : active ? "rgba(56,211,153,0.15)"
          : "rgba(255,255,255,0.05)",
        border: done ? "none"
          : active ? "2px solid #38d399"
          : "2px solid rgba(255,255,255,0.1)",
        color: done ? "#fff" : active ? "#38d399" : "#475569",
        transition: "all 0.3s ease",
        boxShadow: done ? "0 4px 12px rgba(16,185,129,0.35)" : active ? "0 0 12px rgba(56,211,153,0.2)" : "none",
      }}>
        {done ? "✓" : label}
      </div>
    </div>
  );
}

export default function AcademicSetupModal({ userId, onComplete }: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState(1); // 1, 2, 3
  const [universities, setUniversities] = useState<University[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [selectedUniversityId, setSelectedUniversityId] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);

  const [loadingUniversities, setLoadingUniversities] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* ── Fetch universities ── */
  useEffect(() => {
    async function load() {
      const cacheKey = "academic_universities";
      const cached = getCache<University[]>(cacheKey);
      if (cached) { setUniversities(cached); setLoadingUniversities(false); return; }

      const { data, error } = await supabase
        .from("universities")
        .select("university_id, university_name")
        .order("university_name", { ascending: true });

      if (!error && data) {
        setUniversities(data);
        setCache(cacheKey, data);
      }
      setLoadingUniversities(false);
    }
    load();
  }, [supabase]);

  /* ── Fetch branches when university selected ── */
  useEffect(() => {
    if (!selectedUniversityId) { setBranches([]); return; }
    async function load() {
      setLoadingBranches(true);
      const cacheKey = `academic_branches_${selectedUniversityId}`;
      const cached = getCache<Branch[]>(cacheKey);
      if (cached) { setBranches(cached); setLoadingBranches(false); return; }

      const { data, error } = await supabase
        .from("branches")
        .select("branch_id, university_id, branch_name, branch_code")
        .eq("university_id", selectedUniversityId)
        .order("branch_name", { ascending: true });

      if (!error && data) {
        setBranches(data);
        setCache(cacheKey, data);
      }
      setLoadingBranches(false);
    }
    load();
  }, [selectedUniversityId, supabase]);

  const filteredBranches = branches.filter(b => b.university_id === selectedUniversityId);
  const uniName = universities.find(u => u.university_id === selectedUniversityId)?.university_name || "";
  const branchName = branches.find(b => b.branch_id === selectedBranchId)?.branch_name || "";

  /* ── Next step validation ── */
  const handleNext = () => {
    setError("");
    if (step === 1) {
      if (!selectedUniversityId) { setError("Please select your university."); return; }
      setStep(2);
    } else if (step === 2) {
      if (!selectedBranchId) { setError("Please select your branch."); return; }
      setStep(3);
    }
  };

  /* ── Final submit ── */
  const handleSubmit = async () => {
    if (!selectedSemester) { setError("Please select your semester."); return; }
    if (!selectedUniversityId || !selectedBranchId) return;

    setSaving(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("users")
        .update({
          university_id: selectedUniversityId,
          branch_id: selectedBranchId,
          semester: selectedSemester,
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      onComplete({
        universityId: selectedUniversityId,
        branchId: selectedBranchId,
        semester: selectedSemester,
        universityName: uniName,
        branchName,
      });
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Step labels & icons ── */
  const stepMeta = [
    { label: "1", title: "University", subtitle: "Which university do you attend?" },
    { label: "2", title: "Branch", subtitle: "What's your branch of study?" },
    { label: "3", title: "Semester", subtitle: "Which semester are you currently in?" },
  ];

  return (
    /* Backdrop */
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(2,12,27,0.92)",
      backdropFilter: "blur(18px)",
      WebkitBackdropFilter: "blur(18px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
      animation: "acadFadeIn 0.35s ease",
    }}>
      <style>{`
        @keyframes acadFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes acadSlideUp { from { opacity:0; transform:translateY(24px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes acadStepIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
      `}</style>

      {/* Modal Card */}
      <div style={{
        width: "100%", maxWidth: 460,
        background: "linear-gradient(145deg, #0a1628 0%, #070f1e 100%)",
        border: "1px solid rgba(56,211,153,0.18)",
        borderRadius: 24,
        padding: "40px 36px",
        boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(56,211,153,0.06)",
        animation: "acadSlideUp 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards",
        position: "relative",
        overflow: "hidden",
      }}>

        {/* Glow orb top-right */}
        <div style={{
          position: "absolute", top: -60, right: -60,
          width: 200, height: 200, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(56,211,153,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: "linear-gradient(135deg, #10b981, #059669)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.5rem", margin: "0 auto 16px",
            boxShadow: "0 8px 24px rgba(16,185,129,0.35)",
          }}>🎓</div>
          <h2 style={{
            margin: "0 0 6px",
            fontSize: "1.4rem", fontWeight: 800,
            background: "linear-gradient(135deg, #fff, #38d399)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "-0.02em",
          }}>
            Academic Setup
          </h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.85rem" }}>
            Tell us about yourself to personalize your experience
          </p>
        </div>

        {/* Step Progress */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 32 }}>
          {[1, 2, 3].map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StepDot
                label={String(s)}
                active={step === s}
                done={step > s}
              />
              {i < 2 && (
                <div style={{
                  width: 48, height: 2, borderRadius: 2,
                  background: step > s + 1
                    ? "linear-gradient(90deg,#10b981,#059669)"
                    : step > s
                    ? "rgba(56,211,153,0.4)"
                    : "rgba(255,255,255,0.07)",
                  transition: "background 0.4s ease",
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div key={step} style={{ animation: "acadStepIn 0.3s ease" }}>
          <div style={{ marginBottom: 6 }}>
            <p style={{ margin: "0 0 4px", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#38d399" }}>
              Step {step} of 3
            </p>
            <h3 style={{ margin: "0 0 2px", fontSize: "1.05rem", fontWeight: 700, color: "#f1f5f9" }}>
              {stepMeta[step - 1].title}
            </h3>
            <p style={{ margin: "0 0 18px", fontSize: "0.82rem", color: "#64748b" }}>
              {stepMeta[step - 1].subtitle}
            </p>
          </div>

          {/* Step 1 — University */}
          {step === 1 && (
            <CustomSelect
              label=""
              value={selectedUniversityId || ""}
              placeholder={loadingUniversities ? "Loading universities..." : "Select your university"}
              disabled={loadingUniversities}
              options={universities.map(u => ({ value: u.university_id, label: u.university_name }))}
              onChange={(v) => { setSelectedUniversityId(v || null); setSelectedBranchId(null); setError(""); }}
            />
          )}

          {/* Step 2 — Branch */}
          {step === 2 && (
            <>
              {/* Show selected university as context */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", borderRadius: 10, marginBottom: 14,
                background: "rgba(56,211,153,0.06)", border: "1px solid rgba(56,211,153,0.15)",
              }}>
                <span style={{ fontSize: "0.75rem", color: "#38d399", fontWeight: 600 }}>🏛️ {uniName}</span>
              </div>
              <CustomSelect
                label=""
                value={selectedBranchId || ""}
                placeholder={loadingBranches ? "Loading branches..." : "Select your branch"}
                disabled={loadingBranches}
                options={filteredBranches.map(b => ({
                  value: b.branch_id,
                  label: `${b.branch_name}${b.branch_code ? ` (${b.branch_code})` : ""}`,
                }))}
                onChange={(v) => { setSelectedBranchId(v || null); setError(""); }}
              />
            </>
          )}

          {/* Step 3 — Semester */}
          {step === 3 && (
            <>
              {/* Context pills */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                {[
                  { icon: "🏛️", text: uniName },
                  { icon: "📚", text: branchName },
                ].map((pill, i) => (
                  <div key={i} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "5px 10px", borderRadius: 100,
                    background: "rgba(56,211,153,0.06)", border: "1px solid rgba(56,211,153,0.15)",
                    fontSize: "0.73rem", color: "#38d399", fontWeight: 600,
                  }}>
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
                      padding: "14px 8px", borderRadius: 12, border: "2px solid",
                      borderColor: selectedSemester === sem ? "#38d399" : "rgba(255,255,255,0.08)",
                      background: selectedSemester === sem
                        ? "rgba(56,211,153,0.12)"
                        : "rgba(255,255,255,0.02)",
                      color: selectedSemester === sem ? "#38d399" : "#64748b",
                      fontWeight: selectedSemester === sem ? 700 : 500,
                      fontSize: "0.85rem", cursor: "pointer",
                      transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                      transform: selectedSemester === sem ? "scale(1.05)" : "scale(1)",
                      boxShadow: selectedSemester === sem ? "0 0 12px rgba(56,211,153,0.2)" : "none",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    Sem {sem}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <p style={{
            marginTop: 12, fontSize: "0.8rem", color: "#ef4444",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            ⚠️ {error}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          {step > 1 && (
            <button
              onClick={() => { setStep(s => s - 1); setError(""); }}
              style={{
                flex: 1, padding: "13px",
                borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)", color: "#94a3b8",
                fontWeight: 600, fontSize: "0.875rem", cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                transition: "all 0.2s",
              }}
            >
              ← Back
            </button>
          )}

          <button
            onClick={step < 3 ? handleNext : handleSubmit}
            disabled={saving}
            style={{
              flex: 2, padding: "13px",
              borderRadius: 12, border: "none",
              background: saving
                ? "rgba(56,211,153,0.3)"
                : "linear-gradient(135deg, #10b981, #059669)",
              color: "#fff",
              fontWeight: 700, fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "Inter, sans-serif",
              boxShadow: "0 4px 16px rgba(16,185,129,0.35)",
              transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
              transform: "scale(1)",
            }}
            onMouseEnter={e => { if (!saving) (e.target as HTMLButtonElement).style.transform = "scale(1.02)"; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.transform = "scale(1)"; }}
          >
            {saving ? "Saving…" : step < 3 ? "Next →" : "🚀 Enter Study Hub"}
          </button>
        </div>
      </div>
    </div>
  );
}
