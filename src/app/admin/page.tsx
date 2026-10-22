"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Mail,
  Sparkles,
  BookOpen,
  Video,
  Award,
  FileCheck2,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Trash2,
  Eye,
  ExternalLink,
  LogOut,
  Code2,
  Play,
  Layers,
  BarChart3,
  Settings,
  HelpCircle,
  ArrowRight,
  Check,
  Copy,
  Zap,
  Gauge
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { fetchAllCourses } from "@/lib/courses/coursesService";
import { Course, CourseLesson } from "@/types/courses";
import "@/styles/AdminPortal.css";

const AUTHORIZED_ADMIN_EMAIL = "amirshaikh@gmail.com";

type AdminTab = "dashboard" | "courses" | "assignments" | "submissions" | "mcqs" | "rag";

export default function AdminPortalPage() {
  const supabase = createClient();

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // OTP Login Flow State
  const [loginStep, setLoginStep] = useState<"email" | "otp">("email");
  const [emailInput, setEmailInput] = useState(AUTHORIZED_ADMIN_EMAIL);
  const [otpInput, setOtpInput] = useState(["", "", "", "", "", ""]);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Active Admin Workspace Tab
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

  // Courses & Lessons State
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [loadingCourses, setLoadingCourses] = useState(false);

  // AI Assignment Studio State
  const [generatingAssignment, setGeneratingAssignment] = useState(false);
  const [generatedAssignment, setGeneratedAssignment] = useState<any>(null);
  const [publishingAssignment, setPublishingAssignment] = useState(false);
  const [assignmentPublishSuccess, setAssignmentPublishSuccess] = useState(false);

  // Submissions State
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // MCQ Bank State
  const [mcqQuestions, setMcqQuestions] = useState<any[]>([]);
  const [loadingMcqs, setLoadingMcqs] = useState(false);

  // 1. Check existing Supabase Session on Mount
  useEffect(() => {
    let isMounted = true;
    async function verifyExistingSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && session.user.email?.toLowerCase().trim() === AUTHORIZED_ADMIN_EMAIL) {
          if (isMounted) {
            setIsAuthenticated(true);
            setAdminUser(session.user);
          }
        } else if (session?.user) {
          // If logged in with non-admin email, sign out from admin portal
          await supabase.auth.signOut();
        }
      } catch (err) {
        console.error("Session check error:", err);
      } finally {
        if (isMounted) setCheckingAuth(false);
      }
    }
    verifyExistingSession();
    return () => { isMounted = false; };
  }, [supabase]);

  // Load courses once authenticated
  const loadPlatformCourses = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const data = await fetchAllCourses();
      setCourses(data || []);
      if (data && data.length > 0) {
        setSelectedCourseId(data[0].id);
        const firstLesson = data[0].modules?.[0]?.lessons?.[0];
        if (firstLesson) setSelectedLessonId(firstLesson.id);
      }
    } catch (err) {
      console.error("Error loading courses:", err);
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadPlatformCourses();
    }
  }, [isAuthenticated, loadPlatformCourses]);

  // 2. Strict OTP Request Handler
  const handleSendAdminOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const cleanEmail = emailInput.trim().toLowerCase();

    // STRICT CHECK: Only amirshaikh@gmail.com is allowed
    if (cleanEmail !== AUTHORIZED_ADMIN_EMAIL) {
      setAuthError(`Access Denied: Portal is strictly restricted to ${AUTHORIZED_ADMIN_EMAIL}.`);
      return;
    }

    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: false,
          data: { role: "admin" }
        }
      });

      if (error) {
        // If user not created in supabase auth yet, try with create allowed
        const { error: retryError } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { shouldCreateUser: true }
        });
        if (retryError) throw retryError;
      }

      setAuthSuccess(`Secure 6-digit OTP code sent to ${cleanEmail}. Please check your inbox.`);
      setLoginStep("otp");
    } catch (err: any) {
      console.error("OTP send error:", err);
      setAuthError(err.message || "Failed to send OTP code. Please check SMTP configuration.");
    } finally {
      setAuthLoading(false);
    }
  };

  // 3. Strict OTP Verify Handler
  const handleVerifyAdminOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const otpCode = otpInput.join("").replace(/\D/g, "").trim();
    if (otpCode.length !== 6) {
      setAuthError("Please enter the complete 6-digit OTP code.");
      return;
    }

    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: AUTHORIZED_ADMIN_EMAIL,
        token: otpCode,
        type: "email",
      });

      if (error) throw error;

      if (!data.user || data.user.email?.toLowerCase().trim() !== AUTHORIZED_ADMIN_EMAIL) {
        await supabase.auth.signOut();
        throw new Error("Unauthorized identity. Verification rejected.");
      }

      setIsAuthenticated(true);
      setAdminUser(data.user);
      setAuthSuccess("Authentication verified! Welcome Administrator.");
    } catch (err: any) {
      console.error("OTP verification error:", err);
      setAuthError(err.message || "Invalid or expired OTP. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setAdminUser(null);
    setLoginStep("email");
    setOtpInput(["", "", "", "", "", ""]);
  };

  // Helper: Handle OTP input typing
  const handleOtpCharChange = (val: string, index: number) => {
    const digit = val.slice(-1);
    const updated = [...otpInput];
    updated[index] = digit;
    setOtpInput(updated);

    // Auto-focus next input
    if (digit && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Helper: Get active course and lesson objects
  const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
  const allLessons = activeCourse?.modules?.flatMap((m) => m.lessons) || [];
  const activeLesson = allLessons.find((l) => l.id === selectedLessonId) || allLessons[0];

  // 4. Generate AI Assignment via Cloud Run Backend
  const handleGenerateAssignment = async () => {
    if (!activeLesson) return;
    setGeneratingAssignment(true);
    setGeneratedAssignment(null);
    setAssignmentPublishSuccess(false);

    try {
      const response = await fetch(`/api/admin/lessons/${activeLesson.id}/assignments/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_override: activeLesson.title,
          difficulty: "intermediate",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedAssignment(data.assignment);
      } else {
        throw new Error("Failed to generate assignment via AI backend.");
      }
    } catch (err: any) {
      console.error("Assignment generation error:", err);
      alert(err.message || "Failed to generate assignment. Ensure backend Cloud Run is running.");
    } finally {
      setGeneratingAssignment(false);
    }
  };

  // 5. Publish Assignment
  const handlePublishAssignment = async () => {
    if (!generatedAssignment) return;
    setPublishingAssignment(true);
    try {
      const response = await fetch(`/api/admin/assignments/${generatedAssignment.id}/publish`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: true }),
      });

      if (response.ok) {
        setAssignmentPublishSuccess(true);
        setTimeout(() => setAssignmentPublishSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Publish error:", err);
    } finally {
      setPublishingAssignment(false);
    }
  };

  // 6. Fetch Submissions for active assignment
  const loadSubmissions = async (assignmentId: string) => {
    setLoadingSubmissions(true);
    try {
      const res = await fetch(`/api/admin/assignments/${assignmentId}/submissions`);
      if (res.ok) {
        const data = await res.json();
        setSubmissionsList(data.submissions || []);
      }
    } catch (err) {
      console.error("Error loading submissions:", err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // 7. Load MCQs for active lesson
  const loadLessonMcqs = async (lessonId: string) => {
    setLoadingMcqs(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/mcqs/quiz?count=10`);
      if (res.ok) {
        const data = await res.json();
        setMcqQuestions(data.questions || []);
      }
    } catch (err) {
      console.error("Error loading MCQs:", err);
    } finally {
      setLoadingMcqs(false);
    }
  };

  useEffect(() => {
    if (activeLesson) {
      loadLessonMcqs(activeLesson.id);
    }
  }, [activeLesson?.id]);

  // Loading Screen
  if (checkingAuth) {
    return (
      <div className="adminGatekeeperContainer">
        <div style={{ textAlign: "center", color: "#fff" }}>
          <RefreshCw size={36} color="#38d399" className="animate-spin" style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Verifying Administrator Credentials...</h3>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  // UN-AUTHENTICATED: STRICT OTP GATEKEEPER VIEW
  // ────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="adminGatekeeperContainer">
        <div className="adminGatekeeperCard">
          <div className="adminGatekeeperBadge">
            <Lock size={12} /> Strict Administrator Access
          </div>
          <h2 className="adminGatekeeperTitle">ClimbUP Command Center</h2>
          <p className="adminGatekeeperSubtitle">
            Authorized administrator authentication via verified Supabase OTP.
          </p>

          {authError && (
            <div className="adminErrorAlert">
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="adminSuccessAlert">
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{authSuccess}</span>
            </div>
          )}

          {loginStep === "email" ? (
            <form onSubmit={handleSendAdminOtp}>
              <div className="adminInputGroup">
                <label className="adminInputLabel">Administrator Email:</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="amirshaikh@gmail.com"
                  required
                  className="adminTextInput"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="adminPrimaryBtn"
              >
                {authLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Sending Secure OTP...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Request Administrator OTP
                  </>
                )}
              </button>

              <div style={{ marginTop: "20px", fontSize: "12px", color: "#64748b" }}>
                🔒 High-security authentication. Only <strong>amirshaikh@gmail.com</strong> is allowed.
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyAdminOtp}>
              <div style={{ marginBottom: "16px", fontSize: "13px", color: "rgba(255, 255, 255, 0.85)" }}>
                Enter the 6-digit code sent to <strong>{AUTHORIZED_ADMIN_EMAIL}</strong>:
              </div>

              <div className="adminOtpInputGrid">
                {otpInput.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpCharChange(e.target.value, idx)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !digit && idx > 0) {
                        document.getElementById(`otp-${idx - 1}`)?.focus();
                      }
                    }}
                    className="adminOtpCharInput"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={authLoading || otpInput.join("").length !== 6}
                className="adminPrimaryBtn"
                style={{ marginBottom: "14px" }}
              >
                {authLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Verifying OTP...
                  </>
                ) : (
                  <>
                    <KeyRound size={16} /> Verify OTP & Enter Portal
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginStep("email");
                  setAuthError(null);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#38d399",
                  fontSize: "12.5px",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                ← Back to email input
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  // AUTHENTICATED: ENTERPRISE ADMIN COMMAND CENTER
  // ────────────────────────────────────────────────────────
  return (
    <div className="adminRoot">
      {/* Top Command Bar */}
      <header className="adminTopBar">
        <div className="adminTopBarLeft">
          <Link href="/" style={{ textDecoration: "none" }} className="adminBrandBadge">
            <span style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #38d399 0%, #059669 100%)",
              display: "grid",
              placeItems: "center",
              color: "#021526",
              fontWeight: 900
            }}>
              ▲
            </span>
            <span>ClimbUP</span>
          </Link>
          <span className="adminPortalTag">
            <ShieldCheck size={12} style={{ display: "inline", marginRight: "4px" }} />
            Admin Suite
          </span>
          <span style={{ fontSize: "12px", color: "#38d399", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#38d399", boxShadow: "0 0 8px #38d399" }} />
            Dual-AI Engine Online
          </span>
        </div>

        <div className="adminTopBarRight">
          <div className="adminUserPill">
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#38d399" }} />
            <span>{AUTHORIZED_ADMIN_EMAIL}</span>
          </div>

          <button type="button" onClick={handleLogout} className="adminLogoutBtn">
            <LogOut size={14} /> Exit
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="adminWorkspace">
        {/* Left Navigation Sidebar */}
        <aside className="adminSidebar">
          {[
            { id: "dashboard", label: "Dashboard", icon: BarChart3 },
            { id: "courses", label: "Course & Videos", icon: BookOpen },
            { id: "assignments", label: "AI Assignment Studio", icon: Sparkles },
            { id: "submissions", label: "Student Submissions", icon: FileCheck2 },
            { id: "mcqs", label: "MCQ Bank Manager", icon: Award },
            { id: "rag", label: "RAG Doubt Monitor", icon: HelpCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`adminNavBtn ${isActive ? "active" : ""}`}
              >
                <Icon size={17} color={isActive ? "#38d399" : "#94a3b8"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Content View Area */}
        <main className="adminContentArea">
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === "dashboard" && (
            <div>
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>
                  Platform Operations Dashboard
                </h2>
                <p style={{ color: "rgba(255, 255, 255, 0.65)", margin: 0, fontSize: "14px" }}>
                  Real-time telemetry, Dual-AI infrastructure health, and student engagement statistics.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="adminStatsGrid">
                <div className="adminStatCard">
                  <div className="adminStatIconBox">
                    <BookOpen size={22} />
                  </div>
                  <div>
                    <div className="adminStatValue">{courses.length}</div>
                    <div className="adminStatLabel">Active Courses</div>
                  </div>
                </div>

                <div className="adminStatCard">
                  <div className="adminStatIconBox">
                    <Video size={22} />
                  </div>
                  <div>
                    <div className="adminStatValue">
                      {courses.reduce((acc, c) => acc + (c.modules?.flatMap((m) => m.lessons)?.length || 0), 0)}
                    </div>
                    <div className="adminStatLabel">Video Lectures</div>
                  </div>
                </div>

                <div className="adminStatCard">
                  <div className="adminStatIconBox">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <div className="adminStatValue">Dual-AI</div>
                    <div className="adminStatLabel">Groq Qwen + Gemini 2.5</div>
                  </div>
                </div>

                <div className="adminStatCard">
                  <div className="adminStatIconBox">
                    <Users size={22} />
                  </div>
                  <div>
                    <div className="adminStatValue">Active</div>
                    <div className="adminStatLabel">Enrolled Cohort</div>
                  </div>
                </div>
              </div>

              {/* AI Architecture & Engine Status Card */}
              <div className="adminStudioCard">
                <div className="adminStudioHeader">
                  <h3 className="adminStudioTitle">
                    <Gauge size={20} color="#38d399" />
                    AI Infrastructure & Engine Status
                  </h3>
                  <span style={{ fontSize: "12px", color: "#38d399", background: "rgba(56, 211, 153, 0.12)", padding: "4px 10px", borderRadius: "6px" }}>
                    All Systems Operational
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <strong style={{ color: "#fff", fontSize: "14px" }}>Cloud Run Microservice</strong>
                      <span style={{ color: "#38d399", fontSize: "12px", fontWeight: 700 }}>Online</span>
                    </div>
                    <p style={{ fontSize: "12.5px", color: "#94a3b8", margin: 0 }}>
                      Backend serving HLS video streams, EduRAG vector retrieval, and prompt injection filters.
                    </p>
                  </div>

                  <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <strong style={{ color: "#fff", fontSize: "14px" }}>Dual-AI Synthesis Engine</strong>
                      <span style={{ color: "#38d399", fontSize: "12px", fontWeight: 700 }}>Groq + Gemini</span>
                    </div>
                    <p style={{ fontSize: "12.5px", color: "#94a3b8", margin: 0 }}>
                      Primary: qwen/qwen3.8-27b on Groq. Failover: gemini-2.5-flash for 100% uptime with zero extra cost.
                    </p>
                  </div>

                  <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <strong style={{ color: "#fff", fontSize: "14px" }}>Supabase Auth & Database</strong>
                      <span style={{ color: "#38d399", fontSize: "12px", fontWeight: 700 }}>SMTP Active</span>
                    </div>
                    <p style={{ fontSize: "12.5px", color: "#94a3b8", margin: 0 }}>
                      Custom SMTP delivery enabled. Strict admin OTP policy enforced for {AUTHORIZED_ADMIN_EMAIL}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COURSE & VIDEO LECTURE HUB */}
          {activeTab === "courses" && (
            <div>
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>
                  Course & Lecture Catalog
                </h2>
                <p style={{ color: "rgba(255, 255, 255, 0.65)", margin: 0, fontSize: "14px" }}>
                  Inspect course curriculum, module hierarchies, and video streaming endpoints.
                </p>
              </div>

              <div style={{ display: "grid", gap: "20px" }}>
                {courses.map((course) => (
                  <div key={course.id} className="adminStudioCard">
                    <div className="adminStudioHeader">
                      <div>
                        <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>
                          {course.title}
                        </h3>
                        <span style={{ fontSize: "12.5px", color: "#38d399" }}>
                          Category: {course.category} • {course.level}
                        </span>
                      </div>
                      <Link
                        href={`/courses/${course.id}`}
                        target="_blank"
                        className="adminActionPillBtn"
                        style={{ textDecoration: "none" }}
                      >
                        <Eye size={14} /> Open Classroom View
                      </Link>
                    </div>

                    <div style={{ display: "grid", gap: "10px" }}>
                      {course.modules?.map((mod, mIdx) => (
                        <div key={mod.id || mIdx} style={{ background: "rgba(255, 255, 255, 0.03)", padding: "14px 18px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                          <div style={{ fontWeight: 700, fontSize: "14px", color: "#38d399", marginBottom: "8px" }}>
                            Module {mIdx + 1}: {mod.title} ({mod.lessons?.length || 0} Lessons)
                          </div>
                          <div style={{ display: "grid", gap: "6px" }}>
                            {mod.lessons?.map((les, lIdx) => (
                              <div key={les.id || lIdx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px", color: "rgba(255, 255, 255, 0.85)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <Video size={13} color="#94a3b8" />
                                  <span>{les.title}</span>
                                </div>
                                <span style={{ color: "#94a3b8", fontSize: "12px" }}>{les.duration}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: AI ASSIGNMENT STUDIO & PUBLISHER */}
          {activeTab === "assignments" && (
            <div>
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>
                  Dual-AI Assignment Studio & Publisher
                </h2>
                <p style={{ color: "rgba(255, 255, 255, 0.65)", margin: 0, fontSize: "14px" }}>
                  Synthesize real-world engineering assignments from lecture audio and video, then publish to students.
                </p>
              </div>

              {/* Selector Controls */}
              <div className="adminStudioCard">
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center", marginBottom: "20px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94a3b8", marginBottom: "6px" }}>
                      Select Course:
                    </label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="adminSelectBox"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#94a3b8", marginBottom: "6px" }}>
                      Select Lecture / Lesson:
                    </label>
                    <select
                      value={selectedLessonId}
                      onChange={(e) => setSelectedLessonId(e.target.value)}
                      className="adminSelectBox"
                    >
                      {allLessons.map((l) => (
                        <option key={l.id} value={l.id}>{l.title}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ alignSelf: "flex-end" }}>
                    <button
                      type="button"
                      onClick={handleGenerateAssignment}
                      disabled={generatingAssignment}
                      className="adminActionPillBtn"
                    >
                      {generatingAssignment ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" /> Synthesizing with Dual-AI...
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} /> Generate Milestone Assignment
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Generated Assignment Preview Card */}
                {generatedAssignment ? (
                  <div style={{ background: "rgba(2, 8, 18, 0.85)", border: "1.5px solid rgba(56, 211, 153, 0.35)", borderRadius: "14px", padding: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "#38d399", background: "rgba(56, 211, 153, 0.12)", padding: "3px 10px", borderRadius: "999px" }}>
                          AI Generated Milestone
                        </span>
                        <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#fff", margin: "8px 0 0" }}>
                          {generatedAssignment.title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={handlePublishAssignment}
                        disabled={publishingAssignment}
                        className="adminActionPillBtn"
                        style={{ background: assignmentPublishSuccess ? "#10b981" : undefined }}
                      >
                        {publishingAssignment ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : assignmentPublishSuccess ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <Send size={14} />
                        )}
                        {assignmentPublishSuccess ? "Published to Students!" : "Publish to Cohort"}
                      </button>
                    </div>

                    {/* Scenario Box */}
                    {generatedAssignment.scenario_context && (
                      <div style={{ background: "rgba(16, 185, 129, 0.08)", borderLeft: "4px solid #38d399", padding: "14px 18px", borderRadius: "8px", marginBottom: "20px" }}>
                        <strong style={{ color: "#38d399", fontSize: "13px", display: "block", marginBottom: "4px" }}>
                          Enterprise Scenario Context:
                        </strong>
                        <p style={{ margin: 0, fontSize: "13.5px", color: "rgba(255, 255, 255, 0.9)", lineHeight: "1.6" }}>
                          {generatedAssignment.scenario_context}
                        </p>
                      </div>
                    )}

                    {/* 3 Challenges */}
                    {generatedAssignment.problems && (
                      <div style={{ display: "grid", gap: "12px", marginBottom: "20px" }}>
                        {generatedAssignment.problems.map((prob: any, pIdx: number) => (
                          <div key={pIdx} style={{ background: "rgba(255, 255, 255, 0.03)", padding: "14px 18px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                              <span style={{ fontSize: "12px", fontWeight: 700, color: "#38d399", textTransform: "uppercase" }}>
                                Challenge {pIdx + 1}: {prob.tier}
                              </span>
                              <span style={{ fontSize: "12px", color: "#94a3b8" }}>{prob.marks} Pts</span>
                            </div>
                            <p style={{ margin: "0 0 10px", fontSize: "14px", color: "#fff", fontWeight: 600 }}>
                              {prob.problem_statement}
                            </p>
                            {prob.acceptance_criteria && (
                              <div style={{ display: "grid", gap: "4px" }}>
                                {prob.acceptance_criteria.map((c: string, cIdx: number) => (
                                  <div key={cIdx} style={{ fontSize: "12.5px", color: "rgba(255, 255, 255, 0.75)", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <Check size={12} color="#38d399" /> {c}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Starter Code */}
                    {generatedAssignment.starter_code && (
                      <div>
                        <strong style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px" }}>
                          Boilerplate Code:
                        </strong>
                        <pre style={{ background: "#01060f", padding: "14px", borderRadius: "8px", margin: 0, fontSize: "12.5px", color: "#9ef8dc", overflowX: "auto" }}>
                          <code>{generatedAssignment.starter_code}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "32px", color: "rgba(255, 255, 255, 0.6)" }}>
                    Select a lecture above and click <strong>Generate Milestone Assignment</strong> to synthesize with Dual-AI.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: STUDENT SUBMISSIONS REVIEW */}
          {activeTab === "submissions" && (
            <div>
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>
                  Student Submissions & AI Rubric Review
                </h2>
                <p style={{ color: "rgba(255, 255, 255, 0.65)", margin: 0, fontSize: "14px" }}>
                  Review code solutions evaluated by the 4-pillar AI Rubric.
                </p>
              </div>

              {submissionsList.length > 0 ? (
                <div style={{ display: "grid", gap: "16px" }}>
                  {submissionsList.map((sub, sIdx) => (
                    <div key={sIdx} className="submissionReviewItem">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <div>
                          <strong style={{ fontSize: "15px", color: "#fff" }}>
                            Student: {sub.student_id || "Registered Learner"}
                          </strong>
                          <span style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "10px" }}>
                            Submitted: {sub.submitted_at || "Recent"}
                          </span>
                        </div>
                        <span className="scorePillBadge">
                          Score: {sub.score} / {sub.max_score || 100} ({sub.verdict || "Pass"})
                        </span>
                      </div>

                      {sub.submission_text && (
                        <pre style={{ background: "#01060f", padding: "12px", borderRadius: "8px", fontSize: "12.5px", color: "#9ef8dc", overflowX: "auto", margin: "0 0 10px" }}>
                          <code>{sub.submission_text}</code>
                        </pre>
                      )}

                      <p style={{ margin: 0, fontSize: "13px", color: "rgba(255, 255, 255, 0.85)" }}>
                        <strong style={{ color: "#38d399" }}>AI Feedback: </strong>
                        {sub.actionable_advice || sub.feedback}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="adminStudioCard" style={{ textAlign: "center", padding: "40px" }}>
                  <FileCheck2 size={32} color="#38d399" style={{ margin: "0 auto 12px", display: "block" }} />
                  <h4 style={{ color: "#fff", margin: "0 0 6px" }}>Submissions Telemetry</h4>
                  <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "13.5px", margin: 0 }}>
                    When enrolled students submit code in their classroom workspace, AI evaluations will appear here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: MCQ QUESTION BANK STUDIO */}
          {activeTab === "mcqs" && (
            <div>
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>
                  Cheat-Proof MCQ Question Banks
                </h2>
                <p style={{ color: "rgba(255, 255, 255, 0.65)", margin: 0, fontSize: "14px" }}>
                  Manage randomized question pools with Zero-Answer-Leakage security.
                </p>
              </div>

              <div className="adminStudioCard">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <span style={{ fontSize: "12px", color: "#38d399", fontWeight: 700 }}>
                      Active Lesson: {activeLesson?.title || "Overview"}
                    </span>
                    <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#fff", margin: "4px 0 0" }}>
                      Synthesized Question Pool ({mcqQuestions.length} Questions)
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => activeLesson && loadLessonMcqs(activeLesson.id)}
                    className="adminActionPillBtn"
                  >
                    <RefreshCw size={14} /> Refresh Question Bank
                  </button>
                </div>

                <div style={{ display: "grid", gap: "14px" }}>
                  {mcqQuestions.map((q, idx) => (
                    <div key={q.id || idx} style={{ background: "rgba(255, 255, 255, 0.03)", padding: "16px 20px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12.5px", color: "#38d399", fontWeight: 700 }}>
                          Question {idx + 1}
                        </span>
                        <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                          Topic: {q.topic_tag || "Lecture Concept"}
                        </span>
                      </div>
                      <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#fff", margin: "0 0 12px" }}>
                        {q.question}
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
                        {q.options?.map((opt: string, oIdx: number) => (
                          <div key={oIdx} style={{ background: "rgba(255, 255, 255, 0.04)", padding: "8px 12px", borderRadius: "8px", fontSize: "13px", color: "rgba(255, 255, 255, 0.85)" }}>
                            <strong>{String.fromCharCode(65 + oIdx)}:</strong> {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: RAG DOUBT MONITOR */}
          {activeTab === "rag" && (
            <div>
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>
                  Live Lecture Doubt & Vector Retrieval Monitor
                </h2>
                <p style={{ color: "rgba(255, 255, 255, 0.65)", margin: 0, fontSize: "14px" }}>
                  Monitor AI Mentor performance, vector similarity scores, and student inquiries.
                </p>
              </div>

              <div className="adminStudioCard" style={{ textAlign: "center", padding: "40px" }}>
                <Sparkles size={32} color="#38d399" style={{ margin: "0 auto 12px", display: "block" }} />
                <h4 style={{ color: "#fff", margin: "0 0 6px" }}>EduRAG Vector Stream</h4>
                <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "13.5px", margin: 0, maxWidth: "520px", marginLeft: "auto", marginRight: "auto" }}>
                  Video speech transcripts are split into 768-dim embeddings in Cloud Run. Students receive answers grounded directly with timestamp jump markers.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
