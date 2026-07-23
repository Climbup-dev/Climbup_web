"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Book, Atom, Search, X, ChevronRight,
  ArrowLeft, FileText, Zap, Clock, CheckCircle,
  MessageSquare, Send, Maximize, Minimize, Menu, PlusCircle, Share2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { AddResourceModal, ShareResourceModal } from "@/components/StudentResourceModals";
import { useAuth } from "@/hooks/useAuth";
import { useClassroomChat, ChatMessage } from "@/hooks/useClassroomChat";
import { createClient } from "@/lib/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import "@/styles/StudyHub.css";
import "@/styles/Classroom.css";
import AcademicProfileEditor from "@/components/AcademicProfileEditor";
import { getCache, setCache } from "@/lib/cache";

/* Module-level singleton — avoids Multiple GoTrueClient warning */
const supabaseClient = createClient();

const AuthModal = dynamic(() => import("@/components/AuthModal"), {
  ssr: false,
  loading: () => null,
});

/* ─── Types ─── */
export interface Subject { id: string; subject_name: string; }
export interface Topic {
  classroom_id: string;
  topic_name: string;
  status?: string;
  created_at?: string;
  pdf_url?: string;
  category?: string;
  is_personal?: boolean;
}

/* ─── Premium Image (exact copy from ClassroomClient) ─── */
const PremiumImage = ({ src, alt }: { src?: string; alt?: string }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "10px 14px", background: "rgba(56,211,153,0.05)",
        border: "1px solid rgba(56,211,153,0.18)", borderRadius: 10, marginTop: 12,
      }}>
        <span style={{ color: "#38d399", fontSize: "0.8rem", fontWeight: 600 }}>
          🔗 {alt || "External link"}
        </span>
        {src && (
          <a href={src} target="_blank" rel="noopener noreferrer"
            style={{ color: "#38d399", fontSize: "0.78rem", textDecoration: "underline", wordBreak: "break-all" }}>
            {src}
          </a>
        )}
      </span>
    );
  }

  return (
    <span className="md-image-wrapper">
      {!loaded && <span className="md-image-skeleton" />}
      <img
        src={src} alt={alt || "Diagram"}
        className={`md-image-tag ${loaded ? "loaded" : ""}`}
        style={loaded ? {} : { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain" }}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </span>
  );
};

/* ─── Framer Motion chat bubble variants (exact from ClassroomClient) ─── */
const chatBubbleVariants = {
  hidden: { opacity: 0, y: 22, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring" as const, stiffness: 420, damping: 32 },
  },
};

/* ─── Topic Skeleton ─── */
const TopicSkeletons = () => (
  <div className="topic-skeleton-grid">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="topic-skeleton-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="sk" style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="sk" style={{ height: 14, width: "75%" }} />
            <div className="sk" style={{ height: 12, width: "45%", borderRadius: 100 }} />
          </div>
        </div>
        <div className="sk" style={{ height: 12, width: "90%" }} />
        <div className="sk" style={{ height: 12, width: "70%" }} />
      </div>
    ))}
  </div>
);

/* ─── Badge helper ─── */
const statusBadge = (status?: string) => {
  const s = (status || "active").toLowerCase();
  if (s === "completed") return { cls: "completed", icon: <CheckCircle size={9} />, label: "Done" };
  if (s === "pending" || s === "processing") return { cls: "pending", icon: <Clock size={9} />, label: "Pending" };
  return { cls: "active", icon: <Zap size={9} />, label: "Active" };
};

/* ─── Study Hub Hero (Empty State) ─── */
const StudyHubHero = () => {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 60px", height: "100%", width: "100%", gap: "80px" }}>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: "520px", position: "relative", zIndex: 10 }}>
        <h2 style={{ 
          fontSize: "clamp(38px, 4.5vw, 48px)", 
          fontWeight: 900, 
          lineHeight: 1.1, 
          letterSpacing: "-0.02em", 
          background: "linear-gradient(135deg, #ffffff 30%, #8cf0d0 100%)", 
          WebkitBackgroundClip: "text", 
          WebkitTextFillColor: "transparent",
          margin: "12px 0 16px"
        }}>
          Supercharge Your<br/>
          Study Sessions
        </h2>
        <p style={{ color: "rgba(238, 252, 248, 0.75)", fontSize: "16px", lineHeight: 1.6, maxWidth: "600px", margin: "0 0 24px" }}>
          Select a subject from the left to get started. Ask the AI Study Assistant for instant, accurate answers based on your study materials, and learn faster and smarter.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(234, 252, 246, 0.9)", fontSize: "15px", fontWeight: 600 }}>
            <CheckCircle size={16} color="#38d399" />
            <span>Interactive AI Chat for instant doubt resolution</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(234, 252, 246, 0.9)", fontSize: "15px", fontWeight: 600 }}>
            <CheckCircle size={16} color="#38d399" />
            <span>Distraction-free Focus Mode reading</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(234, 252, 246, 0.9)", fontSize: "15px", fontWeight: 600 }}>
            <CheckCircle size={16} color="#38d399" />
            <span>Organized Assignments and Practicals</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(234, 252, 246, 0.9)", fontSize: "15px", fontWeight: 600 }}>
            <CheckCircle size={16} color="#38d399" />
            <span>Seamlessly Share Resources with Classmates</span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <motion.img 
          src="/study-hub-boy-transparent.png" 
          alt="AI Study Assistant" 
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ 
            width: "100%", 
            maxWidth: 460, 
            filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.4)) drop-shadow(0 0 40px rgba(56, 211, 153, 0.2))", 
            objectFit: "contain"
          }} 
        />
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export default function StudyHubContent() {
  const { currentUser, userAcademicProfile } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<"login" | "register">("login");

  const [hubState, setHubState] = useState<"welcome" | "hub">("hub");

  const [activeClassroomId, setActiveClassroomId] = useState("");
  const [activePdfUrl, setActivePdfUrl] = useState("");
  const [activeTopicName, setActiveTopicName] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [chatCooldown, setChatCooldown] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [pdfHeaderVisible, setPdfHeaderVisible] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Mobile State ── */
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 850);
    handleResize(); // initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [activeSubject, setActiveSubject] = useState("");
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [topicsList, setTopicsList] = useState<Topic[]>([]);
  const [topicsCache, setTopicsCache] = useState<Record<string, Topic[]>>({});
  const [isFetchingTopics, setIsFetchingTopics] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [profileNames, setProfileNames] = useState({ university: "", branch: "" });

  /* ── Modals State ── */
  const [addCategory, setAddCategory] = useState<"assignment" | "practical" | "personal_document" | null>(null);
  const [shareResourceId, setShareResourceId] = useState<string | null>(null);
  const [shareTheme, setShareTheme] = useState<string>("#38d399");

  /* ── Chat state ── */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const supabase = supabaseClient;
  const apiUrl = process.env.NEXT_PUBLIC_CLASS_AGENT_URL || "https://climbup-class-agent.onrender.com";

  const studentId = currentUser?.id || "";
  const studentName = currentUser?.user_metadata?.full_name || currentUser?.email?.split("@")[0] || "Student";

  const showChatbot = !activeCategory || activeCategory === "notes" || activeCategory === "teacher_notes" || activeCategory === "personal_document";

  /* ── WebSocket — exact same as ClassroomClient (mode: "group") ── */
  const handleMessageReceived = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
    if (!msg.isOwn && msg.type !== "system") {
      setIsAiTyping(false);
    }
  }, []);

  const { sendMessage: sendWsMessage, status: connectionStatus } = useClassroomChat({
    classroomId: activeClassroomId,
    mode: "group",
    studentId,
    studentName,
    onMessageReceived: handleMessageReceived,
  });

  /* Auto-scroll chat */
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  /* Reset chat when topic changes */
  useEffect(() => { setMessages([]); }, [activeClassroomId]);

  /* ── Auto-fetch subjects from academic profile ── */
  useEffect(() => {
    if (!userAcademicProfile) return;
    if (subjectsList.length > 0) return; // Prevent re-fetching if already loaded

    const { university_id, branch_id, semester } = userAcademicProfile;
    fetchSubjects(university_id, branch_id, semester);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAcademicProfile]);

  /* ── Transition effect removed (direct to hub) ── */

  /* ── Auth helpers ── */
  const openAuth = (mode: "login" | "register") => { setEntryMode(mode); setAuthOpen(true); };
  const closeAuth = () => { setAuthOpen(false); if (!currentUser) window.location.assign("/"); };

  /* ── Fetch subjects from DB1 (Supabase) ── */
  const fetchSubjects = async (universityId: string, branchId: string, semester: number) => {
    const cacheKey = `subjects_${universityId}_${branchId}_${semester}`;
    const nameCacheKey = `profile_names_${universityId}_${branchId}`;
    const cachedSubjects = getCache(cacheKey);
    const cachedNames = getCache(nameCacheKey);

    if (cachedNames) {
      setProfileNames(cachedNames as { university: string; branch: string });
    } else {
      Promise.all([
        supabase.from("universities").select("university_name").eq("university_id", universityId).single(),
        supabase.from("branches").select("branch_name").eq("branch_id", branchId).single()
      ]).then(([uRes, bRes]) => {
        if (uRes.data && bRes.data) {
          const names = { university: uRes.data.university_name, branch: bRes.data.branch_name };
          setProfileNames(names);
          setCache(nameCacheKey, names);
        }
      });
    }

    if (cachedSubjects) {
      setSubjectsList(cachedSubjects as Subject[]);
      return;
    }

    const { data: subjects, error } = await supabase
      .from("subjects")
      .select("subject_id, subject_name, subject_code, semester")
      .eq("university_id", universityId)
      .eq("branch_id", branchId)
      .eq("semester", String(semester))
      .order("subject_name", { ascending: true });

    if (error) { console.error("Error fetching subjects:", error); return; }
    if (subjects) {
      const mapped = subjects.map((s: any) => ({ id: s.subject_id, subject_name: s.subject_name }));
      setSubjectsList(mapped);
      setCache(cacheKey, mapped);
    }
  };

  /* ── Fetch topics from DB2 (Class Agent) ── */
  const handleSubjectClick = async (subjectId: string, forceRefresh: boolean = false) => {
    setActiveSubject(subjectId);
    setActiveClassroomId("");
    setActiveTopicName("");
    setActivePdfUrl("");
    setActiveCategory("");

    const cacheKey = `topics_${subjectId}_${currentUser?.id || 'guest'}`;
    const cached = getCache(cacheKey);

    // Use cached data if available and we're not forcing a refresh
    if (!forceRefresh && (topicsCache[subjectId] || cached)) {
      const dataToUse = (topicsCache[subjectId] || cached) as Topic[];
      setTopicsList(dataToUse);
      if (!topicsCache[subjectId]) {
        setTopicsCache(prev => ({ ...prev, [subjectId]: dataToUse }));
      }
      return;
    }

    setIsFetchingTopics(true);
    setTopicsList([]);

    try {
      const response = await fetch(`/api/classrooms/subject/${subjectId}`);
      if (!response.ok) throw new Error("Failed to fetch topics");
      let data = await response.json();
      if (!Array.isArray(data.topics)) data.topics = [];
      
      // Fetch user's personal resources for this subject
      let personalData: Topic[] = [];
      if (studentId) {
        // 1. Fetch "My Notes" from classrooms table (Microservices)
        const { data: notes } = await supabase
          .from('classrooms')
          .select('id, topic_name, pdf_url, created_at')
          .eq('subject_id', subjectId)
          .eq('student_id', studentId)
          .order('created_at', { ascending: false });
        
        // 2. Fetch "Assignments" and "Practicals" from student_resources table
        const { data: assignments } = await supabase
          .from('student_resources')
          .select('id, title, type, file_url, created_at')
          .eq('subject_id', subjectId)
          .eq('user_id', studentId)
          .order('created_at', { ascending: false });
        
        const formattedNotes = (notes || []).map((r: any) => ({
          classroom_id: r.id, 
          topic_name: r.topic_name,
          category: 'personal_document',
          pdf_url: r.pdf_url,
          created_at: r.created_at,
          is_personal: true
        }));

        const formattedAssignments = (assignments || []).map((r: any) => ({
          classroom_id: r.id, 
          topic_name: r.title,
          category: r.type,
          pdf_url: r.file_url,
          created_at: r.created_at,
          is_personal: true
        }));

        // Deduplicate: If a "My Note" exists in BOTH classrooms (Render) AND student_resources (Supabase),
        // we keep the classrooms version (so AI chat works) and remove the student_resources duplicate.
        const classroomUrls = new Set(formattedNotes.map(n => n.pdf_url));
        const filteredAssignments = formattedAssignments.filter(a => {
          if (a.category === 'personal_document' && classroomUrls.has(a.pdf_url)) {
            return false; // Skip duplicate
          }
          return true;
        });

        personalData = [...formattedNotes, ...filteredAssignments];
      }

      const allTopics = [...data.topics, ...personalData];
      setTopicsList(allTopics);
      
      // Save to cache
      setTopicsCache(prev => ({ ...prev, [subjectId]: allTopics }));
      setCache(cacheKey, allTopics);
    } catch (err: any) {
      console.warn("Failed to fetch topics:", err);
    } finally {
      setIsFetchingTopics(false);
    }
  };

  /* ── Topic click → open PDF + chat ── */
  const handleTopicClick = (topic: Topic) => {
    setActiveClassroomId(topic.classroom_id);
    setActiveTopicName(topic.topic_name || "");
    setActivePdfUrl(topic.pdf_url || "");
    setActiveCategory(topic.category || "");
    setPdfLoading(true);
    setPdfError(false);
    setPdfHeaderVisible(true);
    setIsFocusMode(false);
    setIsTransitioning(false);
  };

  const handleFocusToggle = () => {
    setIsFocusMode((prev) => !prev);
    setIsTransitioning(true);
    // Transition lasts 0.4s, so reset after 450ms
    setTimeout(() => setIsTransitioning(false), 450);
  };

  /* ── Auto-hide PDF header after inactivity ── */
  const resetHideTimer = useCallback(() => {
    setPdfHeaderVisible((prev) => {
      if (!prev) return true;
      return prev;
    });
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setPdfHeaderVisible(false), 3000);
  }, []);

  // Clean up timer on unmount
  useEffect(() => () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }, []);

  /* ── Send message (exact same as ClassroomClient) ── */
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || chatCooldown) return;
    
    // Spam protection: 3-second cooldown
    setChatCooldown(true);
    setTimeout(() => setChatCooldown(false), 3000);
    
    sendWsMessage(newMessage);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "chat",
        sender: studentName,
        content: newMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isOwn: true,
        isAi: false,
      },
    ]);
    setNewMessage("");
    setIsAiTyping(true);
  };

  /* ── Derived ── */
  const currentSubjectName = subjectsList.find((s) => s.id === activeSubject)?.subject_name || "Select a Subject";
  const filteredSubjects = subjectsList.filter((s) =>
    s.subject_name.toLowerCase().includes(subjectSearch.toLowerCase())
  );
  const welcomeTitle = userAcademicProfile ? `Semester ${userAcademicProfile.semester}` : "Study Hub";
  const isPdfOpen = !!(activeClassroomId && activePdfUrl);

  return (
    <>
      <Navbar onLogin={() => openAuth("login")} onSignUp={() => openAuth("register")} />

      <div className="study-hub-container">

        {/* ─── WELCOME SCREEN ─── */}
        {hubState === "welcome" && (
          <div className="study-hub-welcome-screen">
            <div className="welcome-logo">🎓</div>
            <h1>Loading {welcomeTitle}…</h1>
            <p>Fetching your subjects, hang tight!</p>
            <div className="spinner" />
          </div>
        )}

        {/* ─── MAIN HUB ─── */}
        {hubState === "hub" && (
          <div className="study-hub-main-fade-in" style={{ display: "flex", width: "100%", height: "100%" }}>

            {/* ══ LEFT SIDEBAR — Subjects ══ */}
            {isMobile && isMobileSidebarOpen && (
              <div 
                style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 90 }}
                onClick={() => setIsMobileSidebarOpen(false)}
              />
            )}
            <motion.aside 
              layout
              initial={false}
              animate={{ 
                marginLeft: (isFocusMode && !isMobile) ? -240 : 0,
                opacity: (isFocusMode && !isMobile) ? 0 : 1,
                x: isMobile ? (isMobileSidebarOpen ? 0 : -280) : 0
              }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="study-hub-sidebar"
              style={{
                flex: isMobile ? "none" : "0 0 240px",
                width: 240,
                visibility: (isFocusMode && !isMobile) ? "hidden" : "visible",
                transform: "translateZ(0)",
                position: isMobile ? "absolute" : "relative",
                zIndex: isMobile ? 100 : 20,
                height: "100%",
                left: 0,
                top: 0
              }}
            >
              <div className="sidebar-header">
                {isMobile && (
                  <button onClick={() => setIsMobileSidebarOpen(false)} style={{ position: "absolute", right: 16, top: 22, background: "none", border: "none", color: "#fff" }}>
                    <X size={18} />
                  </button>
                )}
                <div className="sidebar-brand">
                  <h2>Subjects</h2>
                </div>
              </div>

              <nav className="sidebar-nav">
                {filteredSubjects.length === 0 ? (
                  <div style={{ padding: "20px 8px", color: "#475569", fontSize: "0.8rem", textAlign: "center", lineHeight: 1.6 }}>
                    {subjectSearch ? `No subjects matching "${subjectSearch}"` : "No subjects found."}
                  </div>
                ) : (
                  filteredSubjects.map((subject, idx) => (
                    <button
                      key={subject.id}
                      className={`subject-btn ${activeSubject === subject.id ? "active" : ""}`}
                      onClick={() => handleSubjectClick(subject.id)}
                    >
                      <div className="subject-icon">{idx + 1}</div>
                      <span style={{ flex: 1, textAlign: "left" }}>{subject.subject_name}</span>
                      {activeSubject === subject.id && <ChevronRight size={14} />}
                    </button>
                  ))
                )}
              </nav>
            </motion.aside>

            {/* ══ CENTER — Topics Grid / PDF Viewer ══ */}
            <motion.main 
              layout
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="study-hub-center"
            >
              {activeSubject && (
                <div className={`center-header${isPdfOpen ? " header-hidden" : ""}`}>
                  <div className="header-title" style={{ display: "flex", gap: 12, alignItems: "center", width: "100%", justifyContent: "center", position: "relative" }}>
                    {isMobile && (
                      <button 
                        onClick={() => setIsMobileSidebarOpen(true)}
                        style={{ position: "absolute", left: 0, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 6, color: "#fff", cursor: "pointer" }}
                      >
                        <Menu size={18} />
                      </button>
                    )}
                    <h1 style={{ margin: 0, fontSize: "2rem", letterSpacing: "-0.02em" }}>{currentSubjectName}</h1>
                  </div>
                </div>
              )}

              <div className={`center-scroll${isPdfOpen ? " pdf-mode" : ""}`}>

              {/* ── PDF VIEWER ── */}
                {isPdfOpen ? (
                  <div
                    className="pdf-viewer-wrapper"
                    onMouseMove={resetHideTimer}
                    onTouchStart={resetHideTimer}
                    style={{ position: "relative" }}
                  >
                    {/* Floating buttons — permanently visible so users don't get trapped in focus mode */}
                    <div style={{
                      position: "absolute",
                      top: 14,
                      left: 14,
                      zIndex: 20,
                      display: "flex",
                      gap: 10,
                    }}>
                      <button
                        className="pdf-back-btn"
                        onClick={() => {
                          setActiveClassroomId("");
                          setActivePdfUrl("");
                          setActiveTopicName("");
                          setActiveCategory("");
                          setPdfLoading(false);
                          setPdfError(false);
                          setIsFocusMode(false);
                          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
                        }}
                      >
                        <ArrowLeft size={13} /> Back
                      </button>

                      <button
                        className="pdf-back-btn"
                        onClick={handleFocusToggle}
                      >
                        {isFocusMode ? <Minimize size={13} /> : <Maximize size={13} />}
                        {isFocusMode ? "Exit Focus" : "Focus"}
                      </button>
                    </div>

                    {/* Mobile Chat FAB */}
                    {isMobile && !isMobileChatOpen && showChatbot && (
                      <button
                        className="mobile-chat-fab"
                        onClick={() => setIsMobileChatOpen(true)}
                        style={{
                          position: "absolute", bottom: 24, right: 24, zIndex: 30,
                          background: "linear-gradient(135deg, #10b981, #059669)",
                          color: "#fff", border: "none", width: 56, height: 56,
                          borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: "0 8px 32px rgba(16,185,129,0.4)", cursor: "pointer",
                        }}
                      >
                        <MessageSquare size={24} />
                      </button>
                    )}

                    {/* PDF frame container with skeleton */}
                    <div 
                      className="pdf-frame-container"
                      style={{
                        pointerEvents: isTransitioning ? "none" : "auto",
                        willChange: "width",
                        transform: "translateZ(0)",
                      }}
                    >

                      {/* ─ Transition Black Screen Overlay ─ */}
                      <AnimatePresence>
                        {isTransitioning && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{
                              position: "absolute", inset: 0, zIndex: 10,
                              display: "flex", flexDirection: "column",
                              alignItems: "center", justifyContent: "center",
                              background: "rgba(2, 12, 27, 0.98)",
                              backdropFilter: "blur(10px)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: "50%",
                                border: "3px solid rgba(56,211,153,0.15)",
                                borderTopColor: "#38d399",
                                animation: "pdfSpin 0.7s linear infinite",
                              }} />
                              <span style={{ fontSize: "0.95rem", color: "#38d399", fontWeight: 600, letterSpacing: "0.02em" }}>
                                {isFocusMode ? "Entering Focus Mode..." : "Exiting Focus Mode..."}
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* ─ Skeleton shimmer while loading ─ */}
                      {pdfLoading && !pdfError && (
                        <div style={{
                          position: "absolute", inset: 0, zIndex: 2,
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center",
                          background: "rgba(7,15,30,0.95)",
                          borderRadius: 16, gap: 20,
                        }}>
                          {/* Animated shimmer bars */}
                          <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 12, padding: "0 40px" }}>
                            {["80%","65%","90%","55%","75%","85%","60%"].map((w, i) => (
                              <div key={i} className="sk" style={{ height: i === 0 ? 22 : 14, width: w, borderRadius: 8 }} />
                            ))}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                            <div style={{
                              width: 20, height: 20, borderRadius: "50%",
                              border: "2px solid rgba(56,211,153,0.2)",
                              borderTopColor: "#38d399",
                              animation: "pdfSpin 0.8s linear infinite",
                            }} />
                            <span style={{ fontSize: "0.8rem", color: "#475569", fontWeight: 500 }}>Loading PDF…</span>
                          </div>
                          <style>{`@keyframes pdfSpin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                      )}

                      {/* ─ Error state ─ */}
                      {pdfError && (
                        <div style={{
                          position: "absolute", inset: 0, zIndex: 2,
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center",
                          background: "rgba(7,15,30,0.95)", borderRadius: 16, gap: 12,
                        }}>
                          <div style={{
                            width: 56, height: 56, borderRadius: 16,
                            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "1.6rem",
                          }}>📄</div>
                          <p style={{ color: "#f87171", fontWeight: 600, margin: 0, fontSize: "0.9rem" }}>PDF load nahi ho saka</p>
                          <p style={{ color: "#475569", margin: 0, fontSize: "0.8rem" }}>URL check karo ya baad mein try karo</p>
                          <button
                            onClick={() => { setPdfError(false); setPdfLoading(true); }}
                            style={{
                              marginTop: 8, padding: "9px 20px", borderRadius: 100,
                              background: "rgba(56,211,153,0.1)", border: "1px solid rgba(56,211,153,0.25)",
                              color: "#38d399", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
                              fontFamily: "Inter, sans-serif",
                            }}
                          >
                            🔄 Retry
                          </button>
                        </div>
                      )}

                      {/* ─ Actual iframe ─ */}
                      <iframe
                        key={activePdfUrl}
                        src={`${activePdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                        width="100%"
                        height="100%"
                        style={{
                          border: "none",
                          opacity: pdfLoading || pdfError || isTransitioning ? 0 : 1,
                          visibility: isTransitioning ? "hidden" : "visible",
                          transition: "opacity 0.2s ease",
                        }}
                        title="Classroom Material"
                        onLoad={() => setPdfLoading(false)}
                        onError={() => { setPdfLoading(false); setPdfError(true); }}
                      />
                    </div>
                  </div>
                ) : (

                  /* ── TOPICS GRID OR HERO ── */
                  <div className="center-topics-area">
                    <AnimatePresence mode="wait">
                      {!activeSubject ? (
                        <motion.div
                          key="hero"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.3 }}
                          style={{ width: "100%", height: "100%" }}
                        >
                          {currentUser && (!userAcademicProfile || !userAcademicProfile.semester) ? (
                            <div style={{ padding: "40px 20px", maxWidth: "800px", margin: "0 auto", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
                              <div style={{ textAlign: "center", marginBottom: "32px", marginTop: "20px" }}>
                                <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "#fff", marginBottom: "16px", letterSpacing: "-0.02em" }}>Set up your Academic Profile</h2>
                                <p style={{ color: "#94a3b8", fontSize: "1.05rem", lineHeight: 1.6, maxWidth: "600px", margin: "0 auto" }}>
                                  Please complete your profile to unlock personalized subjects, assignments, and AI study materials tailored specifically to your branch and semester.
                                </p>
                              </div>
                              <div style={{ width: "100%", maxWidth: "600px", background: "rgba(255,255,255,0.02)", padding: "30px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)" }}>
                                <AcademicProfileEditor 
                                  userId={currentUser.id} 
                                  onProfileUpdated={() => window.location.reload()} 
                                />
                              </div>
                            </div>
                          ) : (
                            <StudyHubHero />
                          )}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="topics"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.3 }}
                          style={{ width: "100%", display: "flex", flexDirection: "column", height: "100%" }}
                        >
                          {isFetchingTopics ? (
                            <TopicSkeletons />
                          ) : topicsList.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "32px", paddingBottom: "40px" }}>
                              
                              {/* TEACHER NOTES SECTION */}
                              <div>
                                <p className="section-label">Class Notes</p>
                                <div className="notes-grid">
                                  {topicsList.filter(t => !t.category || t.category === "notes" || t.category === "teacher_notes").length > 0 ? (
                                    topicsList.filter(t => !t.category || t.category === "notes" || t.category === "teacher_notes").map((topic, index) => {
                                      const b = statusBadge(topic.status);
                                      const isActive = activeClassroomId === topic.classroom_id;
                                      return (
                                        <motion.div
                                          key={topic.classroom_id}
                                          initial={{ opacity: 0, y: 20 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ duration: 0.4, delay: index * 0.05 }}
                                          className={`note-card ${isActive ? "active-topic" : ""}`}
                                          onClick={() => handleTopicClick(topic)}
                                        >
                                          <div className="note-header">
                                            <div className="note-icon"><Book size={18} /></div>
                                            <h3 className="note-title">{topic.topic_name}</h3>
                                            <span className={`note-badge ${b.cls}`}>{b.icon}&nbsp;{b.label}</span>
                                          </div>
                                          <p className="note-desc">
                                            {topic.created_at
                                              ? `📅 ${new Date(topic.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                                              : "Click to view study material for this topic."}
                                          </p>
                                          <div className="note-footer">
                                            <div className="note-meta"><FileText size={12} /><span>PDF Available</span></div>
                                            <button className="read-btn">Open <ChevronRight size={13} /></button>
                                          </div>
                                        </motion.div>
                                      );
                                    })
                                  ) : (
                                    <p style={{ color: "#64748b", fontSize: "0.9rem" }}>No class notes available yet.</p>
                                  )}
                                </div>
                              </div>

                              {/* PERSONAL DOCUMENTS SECTION */}
                              <div style={{ marginTop: "24px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                                  <p className="section-label" style={{ color: "#2dd4bf", marginBottom: 0 }}>My Notes</p>
                                </div>
                                <div className="notes-grid">
                                  {topicsList.filter(t => t.category === "personal_document").map((topic, index) => {
                                      const b = statusBadge(topic.status);
                                      const isActive = activeClassroomId === topic.classroom_id;
                                      return (
                                        <motion.div
                                          key={topic.classroom_id}
                                          initial={{ opacity: 0, y: 20 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ duration: 0.4, delay: index * 0.05 }}
                                          className={`note-card ${isActive ? "active-topic" : ""}`}
                                          onClick={() => handleTopicClick(topic)}
                                        >
                                          <div className="note-header">
                                            <div className="note-icon" style={{ background: "rgba(45,212,191,0.15)", color: "#2dd4bf", borderColor: "rgba(45,212,191,0.25)", boxShadow: "0 4px 12px rgba(45,212,191,0.15)" }}><FileText size={18} /></div>
                                            <div style={{ flex: 1 }}>
                                              <h3 className="note-title" style={{ marginBottom: "0px" }}>
                                                {topic.topic_name.replace(/\s*\(Shared by .*\)$/, '')}
                                              </h3>
                                            </div>
                                            <span className={`note-badge ${b.cls}`}>{b.icon}&nbsp;{b.label}</span>
                                          </div>
                                          <p className="note-desc">
                                            {topic.topic_name.match(/\(Shared by (.*?)\)$/) 
                                              ? <span style={{ color: "#2dd4bf", fontWeight: 500 }}>✨ Shared by {topic.topic_name.match(/\(Shared by (.*?)\)$/)?.[1]}</span>
                                              : topic.created_at
                                                ? `📅 ${new Date(topic.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                                                : "Click to view document details."}
                                          </p>
                                          <div className="note-footer">
                                            <div className="note-meta"><FileText size={12} /><span>PDF Available</span></div>
                                            <div style={{ display: "flex", gap: "8px" }}>
                                              {topic.is_personal && (
                                                <button 
                                                  className="read-btn" 
                                                  style={{ background: "rgba(45,212,191,0.15)", color: "#2dd4bf" }}
                                                  onClick={(e) => { e.stopPropagation(); setShareResourceId(topic.classroom_id); setShareTheme("#2dd4bf"); }}
                                                >
                                                  <Share2 size={13} /> Share
                                                </button>
                                              )}
                                              <button className="read-btn">Open <ChevronRight size={13} /></button>
                                            </div>
                                          </div>
                                        </motion.div>
                                      );
                                    })
                                  }
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={() => setAddCategory("personal_document")}
                                    style={{
                                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                      border: "2px dashed rgba(45,212,191,0.3)", background: "rgba(45,212,191,0.05)", cursor: "pointer",
                                      minHeight: "160px", gap: "12px", transition: "all 0.2s", borderRadius: "16px"
                                    }}
                                    whileHover={{ scale: 1.02, background: "rgba(45,212,191,0.1)", border: "2px dashed rgba(45,212,191,0.5)" }}
                                  >
                                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(45,212,191,0.15)", color: "#2dd4bf", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                      <PlusCircle size={24} />
                                    </div>
                                    <span style={{ color: "#2dd4bf", fontWeight: 600 }}>Add Note</span>
                                  </motion.div>
                                </div>
                              </div>

                              {/* ASSIGNMENTS SECTION */}
                              <div style={{ marginTop: "24px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                                  <p className="section-label" style={{ color: "#fb923c", marginBottom: 0 }}>Assignments</p>
                                </div>
                                <div className="notes-grid">
                                  {topicsList.filter(t => t.category === "assignment").map((topic, index) => {
                                      const b = statusBadge(topic.status);
                                      const isActive = activeClassroomId === topic.classroom_id;
                                      return (
                                        <motion.div
                                          key={topic.classroom_id}
                                          initial={{ opacity: 0, y: 20 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ duration: 0.4, delay: index * 0.05 }}
                                          className={`note-card ${isActive ? "active-topic" : ""}`}
                                          onClick={() => handleTopicClick(topic)}
                                        >
                                          <div className="note-header">
                                            <div className="note-icon" style={{ background: "rgba(251,146,60,0.15)", color: "#fb923c", borderColor: "rgba(251,146,60,0.25)", boxShadow: "0 4px 12px rgba(251,146,60,0.15)" }}><FileText size={18} /></div>
                                            <div style={{ flex: 1 }}>
                                              <h3 className="note-title" style={{ marginBottom: "0px" }}>
                                                {topic.topic_name.replace(/\s*\(Shared by .*\)$/, '')}
                                              </h3>
                                            </div>
                                            <span className={`note-badge ${b.cls}`}>{b.icon}&nbsp;{b.label}</span>
                                          </div>
                                          <p className="note-desc">
                                            {topic.topic_name.match(/\(Shared by (.*?)\)$/) 
                                              ? <span style={{ color: "#fb923c", fontWeight: 500 }}>✨ Shared by {topic.topic_name.match(/\(Shared by (.*?)\)$/)?.[1]}</span>
                                              : topic.created_at
                                                ? `📅 ${new Date(topic.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                                                : "Click to view assignment details."}
                                          </p>
                                          <div className="note-footer">
                                            <div className="note-meta"><FileText size={12} /><span>PDF Available</span></div>
                                            <div style={{ display: "flex", gap: "8px" }}>
                                              {topic.is_personal && (
                                                <button 
                                                  className="read-btn" 
                                                  style={{ background: "rgba(251,146,60,0.15)", color: "#fb923c" }}
                                                  onClick={(e) => { e.stopPropagation(); setShareResourceId(topic.classroom_id); setShareTheme("#fb923c"); }}
                                                >
                                                  <Share2 size={13} /> Share
                                                </button>
                                              )}
                                              <button className="read-btn">Open <ChevronRight size={13} /></button>
                                            </div>
                                          </div>
                                        </motion.div>
                                      );
                                    })
                                  }
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={() => setAddCategory("assignment")}
                                    style={{
                                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                      border: "2px dashed rgba(251,146,60,0.3)", background: "rgba(251,146,60,0.05)", cursor: "pointer",
                                      minHeight: "160px", gap: "12px", transition: "all 0.2s", borderRadius: "16px"
                                    }}
                                    whileHover={{ scale: 1.02, background: "rgba(251,146,60,0.1)", border: "2px dashed rgba(251,146,60,0.5)" }}
                                  >
                                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(251,146,60,0.15)", color: "#fb923c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                      <PlusCircle size={24} />
                                    </div>
                                    <span style={{ color: "#fb923c", fontWeight: 600 }}>Add Assignment</span>
                                  </motion.div>
                                </div>
                              </div>

                              {/* PRACTICALS SECTION */}
                              <div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                                  <p className="section-label" style={{ color: "#818cf8", marginBottom: 0 }}>Practicals</p>
                                </div>
                                <div className="notes-grid">
                                  {topicsList.filter(t => t.category === "practical").map((topic, index) => {
                                      const b = statusBadge(topic.status);
                                      const isActive = activeClassroomId === topic.classroom_id;
                                      return (
                                        <motion.div
                                          key={topic.classroom_id}
                                          initial={{ opacity: 0, y: 20 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ duration: 0.4, delay: index * 0.05 }}
                                          className={`note-card ${isActive ? "active-topic" : ""}`}
                                          onClick={() => handleTopicClick(topic)}
                                        >
                                          <div className="note-header">
                                            <div className="note-icon" style={{ background: "rgba(129,140,248,0.15)", color: "#818cf8", borderColor: "rgba(129,140,248,0.25)", boxShadow: "0 4px 12px rgba(129,140,248,0.15)" }}><FileText size={18} /></div>
                                            <h3 className="note-title">{topic.topic_name.replace(/\s*\(Shared by .*\)$/, '')}</h3>
                                            <span className={`note-badge ${b.cls}`}>{b.icon}&nbsp;{b.label}</span>
                                          </div>
                                          <p className="note-desc">
                                            {topic.topic_name.match(/\(Shared by (.*?)\)$/) 
                                              ? <span style={{ color: "#818cf8", fontWeight: 500 }}>✨ Shared by {topic.topic_name.match(/\(Shared by (.*?)\)$/)?.[1]}</span>
                                              : topic.created_at
                                                ? `📅 ${new Date(topic.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                                                : "Click to view practical instructions."}
                                          </p>
                                          <div className="note-footer">
                                            <div className="note-meta"><FileText size={12} /><span>PDF Available</span></div>
                                            <div style={{ display: "flex", gap: "8px" }}>
                                              {topic.is_personal && (
                                                <button 
                                                  className="read-btn" 
                                                  style={{ background: "rgba(129,140,248,0.15)", color: "#818cf8" }}
                                                  onClick={(e) => { e.stopPropagation(); setShareResourceId(topic.classroom_id); setShareTheme("#818cf8"); }}
                                                >
                                                  <Share2 size={13} /> Share
                                                </button>
                                              )}
                                              <button className="read-btn">Open <ChevronRight size={13} /></button>
                                            </div>
                                          </div>
                                        </motion.div>
                                      );
                                    })
                                  }
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={() => setAddCategory("practical")}
                                    style={{
                                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                      border: "2px dashed rgba(129,140,248,0.3)", background: "rgba(129,140,248,0.05)", cursor: "pointer",
                                      minHeight: "160px", gap: "12px", transition: "all 0.2s", borderRadius: "16px"
                                    }}
                                    whileHover={{ scale: 1.02, background: "rgba(129,140,248,0.1)", border: "2px dashed rgba(129,140,248,0.5)" }}
                                  >
                                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(129,140,248,0.15)", color: "#818cf8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                      <PlusCircle size={24} />
                                    </div>
                                    <span style={{ color: "#818cf8", fontWeight: 600 }}>Add Practical</span>
                                  </motion.div>
                                </div>
                              </div>

                            </div>
                          ) : (
                            <div className="empty-state">
                              <div className="empty-state-icon"><Book size={32} /></div>
                              <h3>No Topics Yet</h3>
                              <p>Topics for this subject haven't been added yet. Check back later!</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.main>

            {/* ══ RIGHT PANEL — Exact classroom chat (only when PDF is open) ══ */}
            <AnimatePresence>
              {isPdfOpen && showChatbot && (
                <motion.div
                  layout
                  initial={{ marginRight: -360, opacity: 0 }}
                  animate={{ 
                    marginRight: (isFocusMode && !isMobile) ? -360 : 0,
                    opacity: (isFocusMode && !isMobile) ? 0 : 1,
                    y: isMobile ? (isMobileChatOpen ? 0 : "100%") : 0
                  }}
                  exit={{ marginRight: -360, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 350, damping: 35 }}
                  className="live-chat-area"
                  style={{ 
                    flex: isMobile ? "none" : "0 0 360px",
                    position: isMobile ? "absolute" : "relative",
                    right: 0,
                    bottom: 0,
                    top: isMobile ? 0 : "auto",
                    width: isMobile ? "100%" : 360,
                    height: "100%",
                    zIndex: isMobile ? 100 : 1,
                    visibility: (isFocusMode && !isMobile) ? "hidden" : "visible",
                    transform: "translateZ(0)",
                    borderLeft: isMobile ? "none" : "1px solid rgba(255,255,255,0.05)", 
                    background: isMobile ? "rgba(2,12,22,0.98)" : "rgba(2,12,22,0.85)", 
                    backdropFilter: "blur(20px)", 
                    display: "flex", 
                    flexDirection: "column",
                  }}
                >
                  {/* Header */}
                  <div className="chat-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <MessageSquare size={14} color="#38d399" />
                    <span className="chat-header-title">Live Q&amp;A</span>
                  </div>
                  {isMobile ? (
                    <button 
                      onClick={() => setIsMobileChatOpen(false)}
                      style={{ marginLeft: "auto", background: "none", border: "none", color: "#f8fafc", cursor: "pointer", display: "flex" }}
                    >
                      <X size={18} />
                    </button>
                  ) : (
                    <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "#1e3a5f" }}>Ask doubts here</span>
                  )}
                </div>

                {/* Messages */}
                <div ref={chatScrollRef} className="messages-scroll">
                  {messages.length === 0 && (
                    <div style={{ margin: "auto", textAlign: "center", color: "#1e3a5f", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      {connectionStatus !== "CONNECTED" ? (
                        <>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid rgba(56,211,153,0.2)", borderTopColor: "#38d399", animation: "pdfSpin 1s linear infinite", marginBottom: 12 }} />
                          <p style={{ margin: 0, fontSize: "0.85rem", color: "#38d399", fontWeight: 600 }}>Reading your notes...</p>
                          <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", opacity: 0.7 }}>Waking up AI Assistant</p>
                        </>
                      ) : (
                        <>
                          <MessageSquare size={30} style={{ marginBottom: 10, opacity: 0.4 }} />
                          <p style={{ margin: 0, fontSize: "0.82rem" }}>Welcome! Ask a doubt anytime.</p>
                        </>
                      )}
                    </div>
                  )}

                  <AnimatePresence initial={false}>
                    {messages.map((msg) => {
                      if (msg.type === "system" || msg.sender === "System") {
                        return (
                          <motion.div key={msg.id} variants={chatBubbleVariants} initial="hidden" animate="visible"
                            style={{ display: "flex", justifyContent: "center" }}>
                            <div className="chat-bubble-system">{msg.content}</div>
                          </motion.div>
                        );
                      }

                      const bubbleClass = msg.isOwn
                        ? "chat-bubble-own"
                        : msg.isAi
                        ? "chat-bubble-ai ai-bubble-glow"
                        : "chat-bubble-other";

                      return (
                        <motion.div key={msg.id} variants={chatBubbleVariants} initial="hidden" animate="visible"
                          style={{
                            display: "flex", gap: 7,
                            flexDirection: msg.isOwn ? "row-reverse" : "row",
                            alignItems: "flex-start",
                            alignSelf: msg.isOwn ? "flex-end" : "flex-start",
                            width: "100%",
                          }}
                        >
                          <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 700, flexShrink: 0, fontSize: "0.74rem",
                            background: msg.isOwn ? "linear-gradient(135deg,#10b981,#059669)" : msg.isAi ? "rgba(56,211,153,.15)" : "rgba(255,255,255,.07)",
                            color: msg.isOwn ? "#fff" : msg.isAi ? "#38d399" : "#e2e8f0",
                            boxShadow: msg.isOwn ? "0 3px 10px rgba(16,185,129,.3)" : "none",
                            border: msg.isAi ? "1px solid rgba(56,211,153,.2)" : "1px solid rgba(255,255,255,.05)",
                          }}>
                            {msg.isOwn ? "Me" : msg.isAi ? "AI" : msg.sender?.charAt(0).toUpperCase()}
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", alignItems: msg.isOwn ? "flex-end" : "flex-start", maxWidth: "82%" }}>
                            <div style={{ fontSize: "0.67rem", fontWeight: 600, color: msg.isOwn ? "#38d399" : msg.isAi ? "#38d399" : "#64748b", marginBottom: 4, opacity: 0.9 }}>
                              {msg.isOwn ? "You" : msg.sender}
                            </div>
                            <div className={`${bubbleClass} markdown-body classroom-markdown-body`}>
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{ img: ({ src, alt }) => <PremiumImage src={src as string} alt={alt} /> }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* AI Typing Indicator */}
                  {isAiTyping && (
                    <motion.div variants={chatBubbleVariants} initial="hidden" animate="visible"
                      style={{ display: "flex", gap: 7, flexDirection: "row", alignItems: "flex-start", width: "100%", marginTop: 8, marginBottom: 8 }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, flexShrink: 0, fontSize: "0.74rem",
                        background: "rgba(56,211,153,.15)", color: "#38d399",
                        border: "1px solid rgba(56,211,153,.2)",
                      }}>
                        AI
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", maxWidth: "82%" }}>
                        <div style={{ fontSize: "0.67rem", fontWeight: 600, color: "#38d399", marginBottom: 4, opacity: 0.9 }}>AI Assistant</div>
                        <div className="chat-bubble-ai ai-bubble-glow" style={{ padding: "10px 14px", display: "flex", gap: 4, alignItems: "center", minHeight: 38 }}>
                          <div className="typing-dot" style={{ animationDelay: "0s" }} />
                          <div className="typing-dot" style={{ animationDelay: "0.2s" }} />
                          <div className="typing-dot" style={{ animationDelay: "0.4s" }} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Input */}
                <div className="chat-input-area">
                  <form onSubmit={handleSendMessage} style={{ display: "flex", gap: 8 }}>
                    <div style={{
                      flex: 1, background: "rgba(30,41,59,.55)", borderRadius: 100,
                      border: "1px solid rgba(255,255,255,.1)", padding: "6px 8px 6px 16px",
                      display: "flex", alignItems: "center", backdropFilter: "blur(12px)",
                    }}>
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={connectionStatus === "CONNECTED" ? (chatCooldown ? "Please wait..." : "Ask a doubt…") : "AI is reading your notes..."}
                        maxLength={500}
                        style={{ flex: 1, background: "transparent", border: "none", color: "#f8fafc", fontSize: "0.875rem", outline: "none", padding: "7px 0" }}
                        disabled={connectionStatus !== "CONNECTED" || chatCooldown}
                      />
                      <span style={{ fontSize: "0.7rem", color: newMessage.length > 450 ? "#ef4444" : "#64748b", paddingRight: "8px", display: "flex", alignItems: "center" }}>
                        {newMessage.length}/500
                      </span>
                      <motion.button
                        type="submit"
                        disabled={!newMessage.trim() || connectionStatus !== "CONNECTED" || chatCooldown}
                        whileHover={newMessage.trim() ? { scale: 1.12 } : {}}
                        whileTap={newMessage.trim() ? { scale: 0.92 } : {}}
                        style={{
                          width: 34, height: 34, borderRadius: "50%",
                          background: newMessage.trim() ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,.06)",
                          border: "none", color: newMessage.trim() ? "#fff" : "#475569",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: !newMessage.trim() || connectionStatus !== "CONNECTED" || chatCooldown ? "not-allowed" : "pointer",
                          marginLeft: 6, flexShrink: 0,
                          boxShadow: newMessage.trim() ? "0 4px 12px rgba(16,185,129,.3)" : "none",
                          transition: "background 0.2s, box-shadow 0.2s",
                        }}
                      >
                        <Send size={14} />
                      </motion.button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          </div>
        )}
      </div>

      {authOpen && (
        <AuthModal open={authOpen} onClose={closeAuth} initialMode={entryMode} />
      )}

      {/* Modals */}
      {addCategory && (
        <AddResourceModal
          isOpen={!!addCategory}
          onClose={() => setAddCategory(null)}
          subjectId={activeSubject}
          category={addCategory}
          userId={studentId}
          universityId={userAcademicProfile?.university_id}
          branchId={userAcademicProfile?.branch_id}
          semester={userAcademicProfile?.semester}
          onSuccess={() => {
            // Refetch topics to show the newly added resource
            if (activeSubject) {
              handleSubjectClick(activeSubject, true);
            }
          }}
        />
      )}

      {shareResourceId && userAcademicProfile && (
        <ShareResourceModal
          isOpen={!!shareResourceId}
          onClose={() => setShareResourceId(null)}
          resourceId={shareResourceId}
          currentUserId={studentId}
          currentUserName={studentName}
          universityId={userAcademicProfile.university_id}
          branchId={userAcademicProfile.branch_id}
          semester={userAcademicProfile.semester}
          themeColor={shareTheme}
        />
      )}
    </>
  );
}
