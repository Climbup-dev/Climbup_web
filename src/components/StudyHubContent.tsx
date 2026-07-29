"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Book, BookOpen, Atom, Search, X, ChevronRight,
  ArrowLeft, FileText, Zap, Clock, CheckCircle,
  MessageSquare, Send, Maximize, Minimize, Menu, PlusCircle, Share2, Trash2, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { AddResourceModal, ShareResourceModal } from "@/components/StudentResourceModals";
import { useAuth } from "@/hooks/useAuth";
import { getOrCreateClimbUPFolder } from "@/lib/googleDriveHelper";
export interface ChatMessage {
  id: number;
  type: "system" | "chat";
  sender: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  isAi: boolean;
}
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
  sender_name?: string;
  original_resource_id?: string;
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
const StudyHubHero = ({ isMobile, onOpenSidebar }: { isMobile?: boolean, onOpenSidebar?: () => void }) => {
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
        {isMobile && (
          <button 
            onClick={onOpenSidebar}
            style={{
              margin: "0 0 24px 0",
              padding: "14px 18px",
              width: "100%",
              background: "linear-gradient(135deg, rgba(56,211,153,0.2), rgba(16,185,129,0.1))",
              color: "#38d399",
              border: "1.5px solid rgba(56, 211, 153, 0.4)",
              borderRadius: "14px",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 8px 24px rgba(56,211,153,0.15)",
              fontFamily: "Inter, sans-serif",
              outline: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: 38, height: 38, borderRadius: "10px", background: "rgba(56,211,153,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#38d399" }}>
                <BookOpen size={20} />
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#fff" }}>📚 Select Your Subject</div>
                <div style={{ fontSize: "0.76rem", color: "#38d399", fontWeight: 500, marginTop: 2 }}>Tap to view assignments & notes</div>
              </div>
            </div>
            <ChevronRight size={18} color="#38d399" />
          </button>
        )}
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
  const { currentUser, userAcademicProfile, refreshProfile } = useAuth();
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

    // Speed optimization: Pre-connect to PDF rendering domains
    const domains = ["https://drive.google.com", "https://lh3.googleusercontent.com"];
    domains.forEach((url) => {
      if (!document.querySelector(`link[href="${url}"]`)) {
        const link = document.createElement("link");
        link.rel = "preconnect";
        link.href = url;
        document.head.appendChild(link);
      }
    });

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Prevent accidental refresh/close when reading a PDF
  useEffect(() => {
    if (!activePdfUrl) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // Standard way to trigger browser warning
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activePdfUrl]);

  const [activeSubject, setActiveSubject] = useState("");
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [topicsList, setTopicsList] = useState<Topic[]>([]);
  const [topicsCache, setTopicsCache] = useState<Record<string, Topic[]>>({});
  const preloadedUrls = useRef<Set<string>>(new Set());
  const loadedPdfCacheRef = useRef<Set<string>>(new Set());

  const pdfFastStreamUrl = useMemo(() => {
    if (!activePdfUrl) return "";
    if (activePdfUrl.includes("supabase.co")) {
      return `${activePdfUrl}#toolbar=0&navpanes=0&scrollbar=1`;
    }
    if (activePdfUrl.includes("drive.google.com")) {
      return activePdfUrl.replace(/\/view.*$/, "/preview");
    }
    return activePdfUrl;
  }, [activePdfUrl]);

  const [warmupUrl, setWarmupUrl] = useState<string>("");

  const handlePreloadPdf = useCallback((pdfUrl?: string) => {
    if (!pdfUrl) return;
    const targetUrl = pdfUrl.includes("supabase.co")
      ? `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`
      : pdfUrl.includes("drive.google.com")
      ? pdfUrl.replace("/view", "/preview")
      : pdfUrl;

    if (!preloadedUrls.current.has(targetUrl)) {
      preloadedUrls.current.add(targetUrl);
      setWarmupUrl(targetUrl);

      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = targetUrl;
      link.as = "document";
      document.head.appendChild(link);
    }
  }, []);
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
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const supabase = supabaseClient;
  const apiUrl = process.env.NEXT_PUBLIC_CLASS_AGENT_URL || "https://climbup-class-agent.onrender.com";

  const studentId = currentUser?.id || "";
  const studentName = currentUser?.user_metadata?.full_name || currentUser?.email?.split("@")[0] || "Student";

  const showChatbot = !activeCategory || activeCategory === "notes" || activeCategory === "teacher_notes" || activeCategory === "personal_document";

  const connectionStatus = "CONNECTED";

  /* Auto-scroll chat */
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  /* Reset chat when topic changes */
  useEffect(() => { setMessages([]); }, [activeClassroomId]);

  /* ── REAL-TIME LIVE SYNC FOR INCOMING SHARED RESOURCES (NO REFRESH NEEDED) ── */
  useEffect(() => {
    if (!studentId) return;

    // 1. Instant WebSocket Realtime Listener
    const channel = supabase
      .channel(`live_shares_${studentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "student_resources",
          filter: `user_id=eq.${studentId}`,
        },
        (payload: any) => {
          const nr = payload.new;
          if (nr) {
            const newTopic: Topic = {
              classroom_id: nr.id,
              topic_name: nr.title,
              category: nr.type || "assignment",
              pdf_url: nr.file_url,
              status: nr.status || "pending",
              sender_name: nr.sender_name,
              original_resource_id: nr.original_resource_id,
              created_at: nr.created_at,
              is_personal: true,
            };
            setTopicsList((prev) => {
              if (prev.some((t) => t.classroom_id === newTopic.classroom_id)) return prev;
              return [newTopic, ...prev];
            });
          }
        }
      )
      .subscribe();

    // 2. Silent background poll every 6s + Window Focus listener
    const syncFreshResources = async () => {
      if (!activeSubject || !studentId) return;
      try {
        const { data: freshData } = await supabase
          .from("student_resources")
          .select("id, title, type, file_url, status, sender_name, original_resource_id, created_at")
          .eq("subject_id", activeSubject)
          .eq("user_id", studentId)
          .order("created_at", { ascending: false });

        if (freshData) {
          const freshTopics: Topic[] = freshData.map((r: any) => ({
            classroom_id: r.id,
            topic_name: r.title,
            category: r.type || "assignment",
            pdf_url: r.file_url,
            status: r.status || "accepted",
            sender_name: r.sender_name,
            original_resource_id: r.original_resource_id,
            created_at: r.created_at,
            is_personal: true,
          }));

          setTopicsList((prev) => {
            if (
              prev.length === freshTopics.length &&
              prev.every((t, i) => t.classroom_id === freshTopics[i]?.classroom_id && t.status === freshTopics[i]?.status)
            ) {
              return prev;
            }
            return freshTopics;
          });
        }
      } catch (e) {
        // Silent catch
      }
    };

    const intervalId = setInterval(syncFreshResources, 6000);
    window.addEventListener("focus", syncFreshResources);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
      window.removeEventListener("focus", syncFreshResources);
    };
  }, [studentId, activeSubject, supabase]);

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
    if (isMobile) setIsMobileSidebarOpen(false);

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
      // Fetch user's personal resources for this subject (fresh fetch from DB)
      let allTopics: Topic[] = [];
      if (studentId) {
        const { data: resources } = await supabase
          .from('student_resources')
          .select('id, title, type, file_url, status, sender_name, original_resource_id, created_at')
          .eq('subject_id', subjectId)
          .eq('user_id', studentId)
          .order('created_at', { ascending: false });
        
        allTopics = (resources || []).map((r: any) => ({
          classroom_id: r.id, 
          topic_name: r.title,
          category: r.type || "assignment", // Ensure fallback category
          pdf_url: r.file_url,
          status: r.status || "accepted",
          sender_name: r.sender_name,
          original_resource_id: r.original_resource_id,
          created_at: r.created_at,
          is_personal: true
        }));
      }

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
    const targetUrl = topic.pdf_url || "";
    const isAlreadyLoaded = loadedPdfCacheRef.current.has(targetUrl);

    setActiveClassroomId(topic.classroom_id);
    setActiveTopicName(topic.topic_name || "");
    setActivePdfUrl(targetUrl);
    setActiveCategory(topic.category || "");
    setPdfLoading(!isAlreadyLoaded);
    setPdfError(false);
    setPdfHeaderVisible(true);
    setIsFocusMode(false);
    setIsTransitioning(false);
  };

  const handleDeleteResource = async (topic: Topic, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${topic.topic_name}"?`)) return;

    try {
      // 1. Delete from Storage if it's a student_files upload
      if (topic.pdf_url && topic.pdf_url.includes('/student_files/')) {
        const filePath = topic.pdf_url.split('/student_files/')[1];
        if (filePath) {
          await supabaseClient.storage.from('student_files').remove([filePath]);
        }
      }

      // 1.5 Delete from Google Drive only if it's user's OWN original upload (not a shared copy)
      if (!topic.original_resource_id && topic.pdf_url && topic.pdf_url.includes('drive.google.com/file/d/')) {
        const driveMatch = topic.pdf_url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (driveMatch && driveMatch[1]) {
          const fileId = driveMatch[1];
          const { data: { session } } = await supabaseClient.auth.getSession();
          const providerToken = session?.provider_token;
          
          if (providerToken) {
            try {
              const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${providerToken}` }
              });
              if (!res.ok) console.warn("Could not delete from Google Drive", await res.text());
            } catch (err) {
              console.warn("Google Drive delete error:", err);
            }
          }
        }
      }

      // 2. Delete from database
      await supabaseClient.from('student_resources').delete().eq('id', topic.classroom_id);

      // 3. Purge from ALL caches (UI state, in-memory topicsCache, localStorage, RAM PDF cache)
      purgeTopicFromAllCaches(topic.classroom_id, topic.pdf_url);
    } catch (error) {
      console.error(error);
      alert('Failed to delete resource');
    }
  };

  const purgeTopicFromAllCaches = (topicId: string, pdfUrl?: string) => {
    // 1. Remove from active topicsList state
    setTopicsList(prev => prev.filter(t => t.classroom_id !== topicId));

    // 2. Remove from topicsCache memory state
    setTopicsCache(prev => {
      const updated: Record<string, Topic[]> = {};
      Object.keys(prev).forEach(subId => {
        updated[subId] = prev[subId].filter(t => t.classroom_id !== topicId);
      });
      return updated;
    });

    // 3. Remove from localStorage cache
    if (activeSubject) {
      const cacheKey = `topics_${activeSubject}_${studentId || 'guest'}`;
      const existingCached = getCache(cacheKey);
      if (existingCached && Array.isArray(existingCached)) {
        const updated = existingCached.filter((t: any) => t.classroom_id !== topicId);
        setCache(cacheKey, updated);
      }
    }

    // 4. Purge RAM PDF pre-loader & 0ms open cache
    if (pdfUrl) {
      loadedPdfCacheRef.current.delete(pdfUrl);
      preloadedUrls.current.delete(pdfUrl);
    }

    // 5. Reset active PDF viewer state if deleted PDF was open
    if (activeClassroomId === topicId) {
      setActiveClassroomId("");
      setActivePdfUrl("");
      setActiveTopicName("");
      setActiveCategory("");
      setWarmupUrl("");
    }
  };

  /* ── Accept / Decline Shared Requests Handlers ── */
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);

  const handleAcceptSharedRequest = async (topic: Topic, e: React.MouseEvent) => {
    e.stopPropagation();
    setAcceptingId(topic.classroom_id);
    try {
      let finalFileUrl = topic.pdf_url || "";

      // Try copying file to student's personal Google Drive if session has Google token
      const { data: { session } } = await supabaseClient.auth.getSession();
      const token = session?.provider_token;

      if (token && topic.pdf_url) {
        try {
          const pdfRes = await fetch(topic.pdf_url);
          if (pdfRes.ok) {
            const blob = await pdfRes.blob();
            const file = new File([blob], `${topic.topic_name}.pdf`, { type: "application/pdf" });

            const folderId = await getOrCreateClimbUPFolder(token);
            const metadata: any = { name: file.name, mimeType: "application/pdf" };
            if (folderId) metadata.parents = [folderId];

            const form = new FormData();
            form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
            form.append("file", file);

            const driveRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: form
            });

            if (driveRes.ok) {
              const driveData = await driveRes.json();
              const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${driveData.id}/permissions`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ type: "anyone", role: "reader" })
              });
              
              if (permRes.ok) {
                finalFileUrl = `https://drive.google.com/file/d/${driveData.id}/view`;
              } else {
                console.warn("Could not set Drive file to public. Falling back to original URL.");
                await fetch(`https://www.googleapis.com/drive/v3/files/${driveData.id}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` }
                });
              }
            }
          }
        } catch (driveErr) {
          console.warn("Could not copy to Google Drive, proceeding with direct URL:", driveErr);
        }
      }

      // Update DB status to 'accepted'
      const { error } = await supabaseClient
        .from("student_resources")
        .update({ status: "accepted", file_url: finalFileUrl })
        .eq("id", topic.classroom_id);

      if (error) throw error;

      // Update local state smoothly
      setTopicsList(prev => prev.map(t => t.classroom_id === topic.classroom_id ? { ...t, status: "accepted", pdf_url: finalFileUrl } : t));
    } catch (err) {
      console.error("Accept Error:", err);
      alert("Failed to accept request. Please try again.");
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDeclineSharedRequest = async (topic: Topic, e: React.MouseEvent) => {
    e.stopPropagation();
    setDecliningId(topic.classroom_id);
    try {
      // Delete ONLY receiver's row from DB (sender's original file is untouched!)
      const { error } = await supabaseClient
        .from("student_resources")
        .delete()
        .eq("id", topic.classroom_id);

      if (error) throw error;

      // Purge from ALL caches instantly
      purgeTopicFromAllCaches(topic.classroom_id, topic.pdf_url);
    } catch (err) {
      console.error("Decline Error:", err);
      alert("Failed to ignore request. Please try again.");
    } finally {
      setDecliningId(null);
    }
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

  /* ── Send message using Serverless Gemini API ── */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachedImage) || chatCooldown) return;
    
    const userMessage = newMessage || "Attached Image";
    const currentAttachedImage = attachedImage;
    
    setNewMessage("");
    setAttachedImage(null);
    setIsAiTyping(true);
    setChatCooldown(true);
    
    // Add user message to UI
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "chat",
        sender: studentName,
        content: userMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isOwn: true,
        isAi: false,
      },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfUrl: activePdfUrl,
          message: userMessage,
          attachedImage: currentAttachedImage,
          history: messages.map(m => ({ role: m.isAi ? 'ai' : 'user', text: m.content }))
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${response.status})`);
      }
      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "chat",
          sender: "ClimbUP AI",
          content: data.reply || "I am unable to answer right now.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isOwn: false,
          isAi: true,
        },
      ]);
    } catch (err) {
      console.error("AI Chat Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "chat",
          sender: "System",
          content: err instanceof Error ? err.message : "AI could not respond. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isOwn: false,
          isAi: true,
        },
      ]);
    } finally {
      setIsAiTyping(false);
      setTimeout(() => setChatCooldown(false), 2000);
    }
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
        {hubState === "hub" && (() => {
          const showChatbot = false; // Temporarily disabled AI Chatbot in Academic section as requested

          const renderPdfNoteCard = (topic: Topic, index: number, themeColor: string, categoryLabel: string) => {
            const b = statusBadge(topic.status);
            const isActive = activeClassroomId === topic.classroom_id;
            const cleanTitle = topic.topic_name.replace(/\s*\(Shared by .*\)$/, '');
            const sharedByMatch = topic.topic_name.match(/\(Shared by (.*?)\)$/);

            return (
              <motion.div
                key={topic.classroom_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className={`note-card ${isActive ? "active-topic" : ""}`}
                onMouseEnter={() => handlePreloadPdf(topic.pdf_url)}
                onTouchStart={() => handlePreloadPdf(topic.pdf_url)}
                onClick={() => handleTopicClick(topic)}
                style={{
                  padding: 0,
                  overflow: "hidden",
                  borderRadius: "18px",
                  border: `1.5px solid ${isActive ? themeColor : "rgba(255,255,255,0.08)"}`,
                  background: "linear-gradient(160deg, rgba(15, 23, 42, 0.9) 0%, rgba(7, 15, 30, 0.95) 100%)",
                  boxShadow: isActive ? `0 0 24px ${themeColor}30` : "0 8px 32px rgba(0,0,0,0.3)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* ── TOP HALF: Actual PDF First Page Live Mini Preview ── */}
                <div style={{
                  height: "105px",
                  width: "100%",
                  background: "#070f1e",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  position: "relative",
                  overflow: "hidden",
                }}>
                  {/* Miniature Live 1st Page Preview of the Actual PDF */}
                  {topic.pdf_url ? (
                    <iframe
                      src={topic.pdf_url.includes("supabase.co")
                        ? `${topic.pdf_url}#page=1&toolbar=0&navpanes=0&scrollbar=0`
                        : topic.pdf_url.includes("drive.google.com")
                        ? topic.pdf_url.replace(/\/view.*$/, "/preview")
                        : topic.pdf_url}
                      title={cleanTitle}
                      style={{
                        width: "230%",
                        height: "230%",
                        border: "none",
                        transform: "scale(0.43)",
                        transformOrigin: "top left",
                        pointerEvents: "none",
                        opacity: 0.88,
                        overflow: "hidden"
                      }}
                      scrolling="no"
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b" }}>
                      <FileText size={24} />
                    </div>
                  )}

                  {/* Gradient Overlay for crisp readability */}
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(180deg, rgba(15,23,42,0.05) 0%, rgba(15,23,42,0.6) 100%)",
                    pointerEvents: "none",
                  }} />
                </div>

                {/* ── BOTTOM HALF: Information & Action Buttons ── */}
                <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div>
                    <h3 className="note-title" style={{ fontSize: "0.92rem", fontWeight: 700, color: "#f8fafc", margin: "0 0 2px", lineHeight: "1.3" }}>
                      {cleanTitle}
                    </h3>
                    <p className="note-desc" style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8" }}>
                      {sharedByMatch ? (
                        <span style={{ color: themeColor, fontWeight: 600 }}>✨ Shared by {sharedByMatch[1]}</span>
                      ) : topic.created_at ? (
                        `📅 ${new Date(topic.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                      ) : (
                        `Click to open ${categoryLabel.toLowerCase()}.`
                      )}
                    </p>
                  </div>

                  <div className="note-footer" style={{ marginTop: "2px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="note-meta" style={{ color: themeColor, fontSize: "0.75rem" }}>
                      <FileText size={12} />
                      <span>PDF Ready</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {topic.is_personal && (
                        <>
                          <button
                            className="read-btn"
                            style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", padding: "6px 10px" }}
                            onClick={(e) => handleDeleteResource(topic, e)}
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            className="read-btn"
                            style={{ background: `${themeColor}20`, color: themeColor }}
                            onClick={(e) => { e.stopPropagation(); setShareResourceId(topic.classroom_id); setShareTheme(themeColor); }}
                          >
                            <Share2 size={13} /> Share
                          </button>
                        </>
                      )}
                      <button className="read-btn" style={{ background: themeColor, color: "#020c1b", fontWeight: 700 }}>
                        Open <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          };

          return (
            <div className="study-hub-main-fade-in" style={{ display: "flex", width: "100%", height: "100%" }}>

            {/* ══ LEFT SIDEBAR — Subjects ══ */}
            {isMobile && isMobileSidebarOpen && (
              <div 
                style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 90 }}
                onClick={() => setIsMobileSidebarOpen(false)}
              />
            )}
            <motion.aside 
              initial={false}
              animate={{ 
                marginLeft: (isFocusMode && !isMobile) ? -240 : 0,
                opacity: (isFocusMode && !isMobile) ? 0 : 1,
                x: isMobile ? (isMobileSidebarOpen ? 0 : -280) : 0
              }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
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
                  <div className="header-title" style={{ display: "flex", gap: 12, alignItems: "center", width: "100%", justifyContent: isMobile ? "flex-start" : "center" }}>
                    {isMobile && (
                      <button 
                        onClick={() => setIsMobileSidebarOpen(true)}
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 6, color: "#fff", cursor: "pointer", flexShrink: 0 }}
                      >
                        <Menu size={18} />
                      </button>
                    )}
                    <h1 style={{ margin: 0, fontSize: "clamp(1.4rem, 4vw, 2rem)", letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentSubjectName}</h1>
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
                    <div 
                      className={`pdf-floating-controls ${isFocusMode ? 'focus-mode-active' : ''}`}
                      style={{
                        position: "absolute",
                        top: 14,
                        left: 14,
                        zIndex: 20,
                        display: "flex",
                        gap: 10,
                      }}
                    >
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

                      <a
                        className="pdf-back-btn"
                        href={activePdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}
                      >
                        <ExternalLink size={13} /> Open
                      </a>
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
                        key={pdfFastStreamUrl}
                        src={pdfFastStreamUrl}
                        width="100%"
                        height="100%"
                        loading="eager"
                        style={{
                          border: "none",
                          opacity: pdfLoading || pdfError || isTransitioning ? 0 : 1,
                          visibility: isTransitioning ? "hidden" : "visible",
                          transition: "opacity 0.15s ease",
                        }}
                        title="Classroom Material"
                        onLoad={() => {
                          if (activePdfUrl) {
                            loadedPdfCacheRef.current.add(activePdfUrl);
                          }
                          setPdfLoading(false);
                        }}
                        onError={() => { setPdfLoading(false); setPdfError(true); }}
                      />

                      {/* ─ Background Memory Pre-render Engine (0ms perceived load time) ─ */}
                      {warmupUrl && warmupUrl !== pdfFastStreamUrl && (
                        <iframe
                          src={warmupUrl}
                          style={{
                            position: "fixed",
                            top: -9999,
                            left: -9999,
                            width: "1px",
                            height: "1px",
                            opacity: 0,
                            pointerEvents: "none",
                            visibility: "hidden",
                          }}
                          aria-hidden="true"
                          tabIndex={-1}
                        />
                      )}
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
                            <div style={{ padding: isMobile ? "20px 12px" : "40px 20px", maxWidth: "800px", margin: "0 auto", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", boxSizing: "border-box", width: "100%" }}>
                              <div style={{ textAlign: "center", marginBottom: isMobile ? "20px" : "32px", marginTop: isMobile ? "10px" : "20px" }}>
                                <h2 style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: 800, color: "#fff", marginBottom: "12px", letterSpacing: "-0.02em" }}>Set up your Academic Profile</h2>
                                <p style={{ color: "#94a3b8", fontSize: isMobile ? "0.9rem" : "1.05rem", lineHeight: 1.5, maxWidth: "600px", margin: "0 auto" }}>
                                  Please complete your profile to unlock personalized subjects, assignments, and AI study materials tailored specifically to your branch and semester.
                                </p>
                              </div>
                              <div style={{ width: "100%", maxWidth: "600px", background: "rgba(255,255,255,0.02)", padding: isMobile ? "16px 12px" : "30px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)", boxSizing: "border-box" }}>
                                <AcademicProfileEditor 
                                  userId={currentUser.id} 
                                  onProfileUpdated={() => {
                                    refreshProfile();
                                  }} 
                                />
                              </div>
                            </div>
                          ) : (
                            <StudyHubHero isMobile={isMobile} onOpenSidebar={() => setIsMobileSidebarOpen(true)} />
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
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "32px", paddingBottom: "40px" }}>
                              {/* SHARED REQUESTS SECTION (PENDING INCOMING SHARES) */}
                              {topicsList.filter(t => t.status === "pending").length > 0 && (
                                <div style={{ marginTop: "24px" }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                                    <p className="section-label" style={{ color: "#38d399", marginBottom: 0, display: "flex", alignItems: "center", gap: 6 }}>
                                      <span>📥 Shared Requests ({topicsList.filter(t => t.status === "pending").length})</span>
                                    </p>
                                  </div>
                                  <div className="notes-grid">
                                    {topicsList.filter(t => t.status === "pending").map((topic, index) => {
                                      const isAccepting = acceptingId === topic.classroom_id;
                                      const isDeclining = decliningId === topic.classroom_id;

                                      return (
                                        <motion.div
                                          key={topic.classroom_id}
                                          initial={{ opacity: 0, y: 20 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ duration: 0.4, delay: index * 0.05 }}
                                          className="note-card"
                                          onClick={() => handleTopicClick(topic)}
                                          style={{ border: "1.5px solid rgba(56,211,153,0.35)", background: "rgba(56,211,153,0.04)", boxShadow: "0 8px 24px rgba(56,211,153,0.1)", cursor: "pointer" }}
                                        >
                                          <div className="note-header">
                                            <div className="note-icon" style={{ background: "rgba(56,211,153,0.15)", color: "#38d399", borderColor: "rgba(56,211,153,0.25)", boxShadow: "0 4px 12px rgba(56,211,153,0.15)" }}>
                                              <Share2 size={18} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                              <h3 className="note-title" style={{ marginBottom: "0px" }}>
                                                {topic.topic_name}
                                              </h3>
                                            </div>
                                            <span className="note-badge" style={{ background: "rgba(56,211,153,0.15)", color: "#38d399", fontWeight: 700 }}>
                                              Pending
                                            </span>
                                          </div>
                                          <p className="note-desc">
                                            <span style={{ color: "#38d399", fontWeight: 600 }}>
                                              ✨ Shared by {topic.sender_name || "a classmate"}
                                            </span>
                                            <span style={{ display: "block", marginTop: "4px", fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>
                                              👆 Click to preview before accepting
                                            </span>
                                          </p>
                                          <div className="note-footer" style={{ marginTop: "14px" }}>
                                            <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                                              <button
                                                className="read-btn"
                                                style={{ flex: 1, background: "rgba(239,68,68,0.15)", color: "#ef4444", padding: "8px", justifyContent: "center", fontWeight: 600 }}
                                                disabled={isAccepting || isDeclining}
                                                onClick={(e) => handleDeclineSharedRequest(topic, e)}
                                              >
                                                {isDeclining ? "Ignoring..." : "Ignore"}
                                              </button>
                                              <button
                                                className="read-btn"
                                                style={{ flex: 2, background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", padding: "8px", justifyContent: "center", fontWeight: 700, boxShadow: "0 4px 14px rgba(16,185,129,0.3)" }}
                                                disabled={isAccepting || isDeclining}
                                                onClick={(e) => handleAcceptSharedRequest(topic, e)}
                                              >
                                                {isAccepting ? "Saving..." : "Accept & Save to My Drive"}
                                              </button>
                                            </div>
                                          </div>
                                        </motion.div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* PERSONAL DOCUMENTS SECTION */}
                              <div style={{ marginTop: "24px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                                  <p className="section-label" style={{ color: "#2dd4bf", marginBottom: 0 }}>My Notes</p>
                                </div>
                                <div className="notes-grid">
                                  {topicsList.filter(t => t.category === "personal_document" && t.status !== "pending").map((topic, index) => 
                                    renderPdfNoteCard(topic, index, "#2dd4bf", "Note")
                                  )}
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={() => setAddCategory("personal_document")}
                                    style={{
                                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                      border: "2px dashed rgba(45,212,191,0.3)", background: "rgba(45,212,191,0.05)", cursor: "pointer",
                                      minHeight: "180px", gap: "10px", transition: "all 0.2s", borderRadius: "18px"
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
                                  {topicsList.filter(t => t.category === "assignment" && t.status !== "pending").map((topic, index) => 
                                    renderPdfNoteCard(topic, index, "#fb923c", "Assignment")
                                  )}
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={() => setAddCategory("assignment")}
                                    style={{
                                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                      border: "2px dashed rgba(251,146,60,0.3)", background: "rgba(251,146,60,0.05)", cursor: "pointer",
                                      minHeight: "180px", gap: "10px", transition: "all 0.2s", borderRadius: "18px"
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
                                  {topicsList.filter(t => t.category === "practical" && t.status !== "pending").map((topic, index) => 
                                    renderPdfNoteCard(topic, index, "#818cf8", "Practical")
                                  )}
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={() => setAddCategory("practical")}
                                    style={{
                                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                      border: "2px dashed rgba(129,140,248,0.3)", background: "rgba(129,140,248,0.05)", cursor: "pointer",
                                      minHeight: "180px", gap: "10px", transition: "all 0.2s", borderRadius: "18px"
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
                  <form onSubmit={handleSendMessage} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {/* Image Preview Thumbnail */}
                    {attachedImage && (
                      <div style={{ position: "relative", alignSelf: "flex-start", marginBottom: "4px" }}>
                        <img 
                          src={attachedImage} 
                          alt="Attached preview" 
                          style={{ height: "60px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)" }} 
                        />
                        <button
                          type="button"
                          onClick={() => setAttachedImage(null)}
                          style={{
                            position: "absolute", top: -6, right: -6, background: "#ef4444", color: "#fff",
                            border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.5)"
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    )}
                    
                    <div style={{ display: "flex", gap: 8, width: "100%" }}>
                      <div style={{
                        flex: 1, background: "rgba(30,41,59,.55)", borderRadius: 100,
                        border: "1px solid rgba(255,255,255,.1)", padding: "6px 8px 6px 16px",
                        display: "flex", alignItems: "center", backdropFilter: "blur(12px)",
                      }}>
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onPaste={(e) => {
                            const items = e.clipboardData?.items;
                            if (!items) return;
                            for (let i = 0; i < items.length; i++) {
                              if (items[i].type.indexOf("image") !== -1) {
                                const blob = items[i].getAsFile();
                                const reader = new FileReader();
                                reader.onload = (event) => setAttachedImage(event.target?.result as string);
                                reader.readAsDataURL(blob!);
                                e.preventDefault();
                              }
                            }
                          }}
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
                        disabled={(!newMessage.trim() && !attachedImage) || connectionStatus !== "CONNECTED" || chatCooldown}
                        whileHover={(newMessage.trim() || attachedImage) ? { scale: 1.12 } : {}}
                        whileTap={(newMessage.trim() || attachedImage) ? { scale: 0.92 } : {}}
                        style={{
                          width: 34, height: 34, borderRadius: "50%",
                          background: (newMessage.trim() || attachedImage) ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,.06)",
                          border: "none", color: (newMessage.trim() || attachedImage) ? "#fff" : "#475569",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: (!newMessage.trim() && !attachedImage) || connectionStatus !== "CONNECTED" || chatCooldown ? "not-allowed" : "pointer",
                          marginLeft: 6, flexShrink: 0,
                          boxShadow: (newMessage.trim() || attachedImage) ? "0 4px 12px rgba(16,185,129,.3)" : "none",
                          transition: "background 0.2s, box-shadow 0.2s",
                        }}
                      >
                        <Send size={14} />
                      </motion.button>
                    </div>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          </div>
          );
        })()}
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
