"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Heart, Search, Bell, Settings, Share2, Download, ArrowLeft, Maximize, Minimize, ExternalLink, X, Menu, Copy, PlusCircle, CheckCircle, MessageSquare, Book, BookOpen, Atom, Zap, Clock, Trash2, ChevronRight, FileText, Send
} from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { getOrCreateClimbUPFolder } from "@/lib/googleDriveHelper";
import { AddResourceModal, ShareResourceModal } from "@/components/StudentResourceModals";
import { StudyHubHero } from "./StudyHub/StudyHubHero";
import { StudyHubSidebar } from "./StudyHub/StudyHubSidebar";
import { StudyHubTopicCard } from "./StudyHub/StudyHubTopicCard";
import { StudyHubPdfViewer } from "./StudyHub/StudyHubPdfViewer";
import { WhatsAppModal } from "./StudyHub/WhatsAppModal";

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

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  
  // WhatsApp Connect State
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [whatsappCode, setWhatsappCode] = useState("");
  const [isGeneratingWaCode, setIsGeneratingWaCode] = useState(false);

  const [pdfHeaderVisible, setPdfHeaderVisible] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Mobile State ── */
  const [isMobile, setIsMobile] = useState(false);

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
  const [shareResourceIds, setShareResourceIds] = useState<string[] | null>(null);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [isAcceptingAll, setIsAcceptingAll] = useState(false);
  const [shareTheme, setShareTheme] = useState<string>("#38d399");

  const supabase = supabaseClient;
  const apiUrl = process.env.NEXT_PUBLIC_CLASS_AGENT_URL || "https://climbup-class-agent.onrender.com";

  const studentId = currentUser?.id || "";
  const studentName = currentUser?.user_metadata?.full_name || currentUser?.email?.split("@")[0] || "Student";

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

    const { university_id, branch_id, semester, mdm_branch_id } = userAcademicProfile as any;
    fetchSubjects(university_id, branch_id, semester, mdm_branch_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAcademicProfile]);

  /* ── Auth helpers ── */
  const openAuth = (mode: "login" | "register") => { setEntryMode(mode); setAuthOpen(true); };
  const closeAuth = () => { setAuthOpen(false); if (!currentUser) window.location.assign("/"); };

  /* ── Fetch subjects from DB1 (Supabase) ── */
  const fetchSubjects = async (universityId: string, branchId: string, semester: number, mdmBranchId?: string | null) => {
    const cacheKey = `subjects_${universityId}_${branchId}_${semester}_${mdmBranchId || ''}_${currentUser?.id || ''}`;
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

    try {
      const fetchPromises: any[] = [
        // 1. Regular Subjects
        supabase
          .from("subjects")
          .select("subject_id, subject_name, subject_code, semester")
          .eq("university_id", universityId)
          .eq("branch_id", branchId)
          .eq("semester", String(semester))
          .order("subject_name", { ascending: true })
      ];

      // 2. MDM Subjects
      if (mdmBranchId) {
        fetchPromises.push(
          supabase
            .from('mdm_subjects')
            .select('mdm_subject_id, subject_name, subject_code, mdm_branch_subject_mapping!inner(branch_id, semester)')
            .eq('mdm_branch_subject_mapping.branch_id', mdmBranchId)
            .eq('mdm_branch_subject_mapping.semester', semester)
            .order('subject_name')
        );
      }

      // 3. OE Subjects
      if (currentUser?.id) {
        fetchPromises.push(
          supabase
            .from("student_open_electives")
            .select(`
              oe_id,
              open_elective_baskets (
                subjects (subject_id, subject_name, subject_code)
              )
            `)
            .eq("user_id", currentUser.id)
            .eq("semester", semester)
            .maybeSingle()
        );
      }

      const results = await Promise.all(fetchPromises);
      
      const regularSubjects = results[0].data || [];
      const mdmSubjects = (mdmBranchId && results[1]?.data) ? results[1].data : [];
      
      const oeIndex = mdmBranchId ? 2 : 1;
      const oeData = (currentUser?.id && results[oeIndex]?.data) ? results[oeIndex].data : null;
      // Handle the nested structure from student_open_electives -> open_elective_baskets -> subjects
      const oeSubjectRaw = oeData?.open_elective_baskets?.subjects;
      // Sometimes it might return an array if the relation is many-to-many, but it should be a single object here.
      // If it is an array, we take the first element, otherwise just use it.
      const actualOeSubject = Array.isArray(oeSubjectRaw) ? oeSubjectRaw[0] : oeSubjectRaw;
      const oeSubject = actualOeSubject ? [actualOeSubject] : [];

      let combined = [
        ...regularSubjects.map((s: any) => ({ id: s.subject_id, subject_name: s.subject_name })),
        ...mdmSubjects.map((s: any) => ({ id: s.mdm_subject_id, subject_name: s.subject_name + ' (MDM)' })),
        ...oeSubject.map((s: any) => ({ id: s.subject_id, subject_name: s.subject_name + ' (OE)' }))
      ];

      setSubjectsList(combined);
      setCache(cacheKey, combined);
    } catch (error) {
      console.error("Error fetching combined subjects:", error);
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

    // SWR Pattern: Immediately show cached data if available
    if (topicsCache[subjectId] || cached) {
      const dataToUse = (topicsCache[subjectId] || cached) as Topic[];
      setTopicsList(dataToUse);
      if (!topicsCache[subjectId]) {
        setTopicsCache(prev => ({ ...prev, [subjectId]: dataToUse }));
      }
      if (!forceRefresh) {
        // Still allow background fetch to happen, but don't show full loading screen
      }
    } else {
      setIsFetchingTopics(true);
      setTopicsList([]);
    }

    try {
      // Always fetch fresh data in the background (unless we strictly shouldn't)
      if (studentId) {
        const { data: resources } = await supabase
          .from('student_resources')
          .select('id, title, type, file_url, status, sender_name, original_resource_id, created_at')
          .eq('subject_id', subjectId)
          .eq('user_id', studentId)
          .order('created_at', { ascending: false });
        
        const allTopics: Topic[] = (resources || []).map((r: any) => ({
          classroom_id: r.id, 
          topic_name: r.title,
          category: r.type || "assignment",
          pdf_url: r.file_url,
          status: r.status || "accepted",
          sender_name: r.sender_name,
          original_resource_id: r.original_resource_id,
          created_at: r.created_at,
          is_personal: true
        }));

        setTopicsList(allTopics);
        setTopicsCache(prev => ({ ...prev, [subjectId]: allTopics }));
        setCache(cacheKey, allTopics);
      }
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

      // Soft Delete: We only remove the reference from the user's profile in the database.
      // We no longer delete the actual file from Google Drive because it is centrally stored.

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

  const cloneSharedFile = async (topic: Topic) => {
    let finalFileUrl = topic.pdf_url || "";
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const token = session?.provider_token;
      if (!token || !topic.pdf_url) return finalFileUrl;

      const folderId = await getOrCreateClimbUPFolder(token);
      const match = topic.pdf_url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      const sourceFileId = match ? match[1] : null;

      if (sourceFileId) {
        // Native Google Drive Copy
        const copyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${sourceFileId}/copy`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ name: `${topic.topic_name}.pdf`, parents: folderId ? [folderId] : [] })
        });
        
        if (copyRes.ok) {
          const copyData = await copyRes.json();
          await fetch(`https://www.googleapis.com/drive/v3/files/${copyData.id}/permissions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ type: "anyone", role: "reader" })
          });
          finalFileUrl = `https://drive.google.com/file/d/${copyData.id}/view`;
        }
      } else if (topic.pdf_url.includes("supabase.co")) {
        // Fallback for Supabase files
        const pdfRes = await fetch(topic.pdf_url);
        if (pdfRes.ok) {
          const blob = await pdfRes.blob();
          const file = new File([blob], `${topic.topic_name}.pdf`, { type: "application/pdf" });
          const metadata: any = { name: file.name, mimeType: "application/pdf" };
          if (folderId) metadata.parents = [folderId];

          const form = new FormData();
          form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
          form.append("file", file);

          const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
            method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form
          });
          if (uploadRes.ok) {
            const driveData = await uploadRes.json();
            await fetch(`https://www.googleapis.com/drive/v3/files/${driveData.id}/permissions`, {
              method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ type: "anyone", role: "reader" })
            });
            finalFileUrl = `https://drive.google.com/file/d/${driveData.id}/view`;
          }
        }
      }
    } catch (e) {
      console.warn("Drive sync failed", e);
    }
    return finalFileUrl;
  };

  const handleAcceptSharedRequest = async (topic: Topic, e: React.MouseEvent) => {
    e.stopPropagation();
    setAcceptingId(topic.classroom_id);
    try {
      const finalFileUrl = await cloneSharedFile(topic);

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

  const handleAcceptAllSharedRequests = async () => {
    setIsAcceptingAll(true);
    try {
      const pendingRequests = topicsList.filter(t => t.status === "pending");
      if (pendingRequests.length === 0) return;

      let updatedTopics = [...topicsList];

      for (const topic of pendingRequests) {
        const finalFileUrl = await cloneSharedFile(topic);

        const { error } = await supabaseClient
          .from("student_resources")
          .update({ status: "accepted", file_url: finalFileUrl })
          .eq("id", topic.classroom_id);

        if (!error) {
          updatedTopics = updatedTopics.map(t => t.classroom_id === topic.classroom_id ? { ...t, status: "accepted", pdf_url: finalFileUrl } : t);
        }
      }
      
      setTopicsList(updatedTopics);
    } catch (err) {
      console.error(err);
      alert("Error accepting all requests.");
    } finally {
      setIsAcceptingAll(false);
    }
  };

  const handleFocusToggle = () => {
    setIsFocusMode((prev) => !prev);
    setIsTransitioning(true);
    // Transition lasts 0.4s, so reset after 450ms
    setTimeout(() => setIsTransitioning(false), 450);
  };

  const handleGenerateWaCode = async () => {
    if (!currentUser) return;
    setIsGeneratingWaCode(true);
    try {
      const res = await fetch('/api/whatsapp/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      const data = await res.json();
      if (data.code) {
        setWhatsappCode(data.code);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingWaCode(false);
    }
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



  /* ── Derived ── */
  const currentSubjectName = subjectsList.find((s) => s.id === activeSubject)?.subject_name || "Select a Subject";
  const filteredSubjects = subjectsList.filter((s) =>
    s.subject_name.toLowerCase().includes(subjectSearch.toLowerCase())
  );
  const welcomeTitle = userAcademicProfile ? `Semester ${userAcademicProfile.semester}` : "Study Hub";
  const isPdfOpen = !!(activeClassroomId && activePdfUrl);

  const handleResourceUploaded = () => {
    if (activeSubject) handleSubjectClick(activeSubject, true);
  };

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




          return (
            <div className="study-hub-main-fade-in" style={{ display: "flex", width: "100%", height: "100%" }}>

            {/* ══ LEFT SIDEBAR — Subjects ══ */}
            <StudyHubSidebar
              isMobile={isMobile}
              isMobileSidebarOpen={isMobileSidebarOpen}
              setIsMobileSidebarOpen={setIsMobileSidebarOpen}
              isFocusMode={isFocusMode}
              filteredSubjects={filteredSubjects}
              subjectSearch={subjectSearch}
              activeSubject={activeSubject}
              handleSubjectClick={handleSubjectClick}
              setShowWhatsappModal={setShowWhatsappModal}
              whatsappNumber={(currentUser as any)?.whatsapp_number}
            />

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

                {isPdfOpen ? (
                  <StudyHubPdfViewer
                    isFocusMode={isFocusMode}
                    pdfLoading={pdfLoading}
                    pdfError={pdfError}
                    isTransitioning={isTransitioning}
                    activePdfUrl={activePdfUrl}
                    pdfFastStreamUrl={pdfFastStreamUrl}
                    warmupUrl={warmupUrl}
                    resetHideTimer={resetHideTimer}
                    handleFocusToggle={handleFocusToggle}
                    onBack={() => {
                      setActiveClassroomId("");
                      setActivePdfUrl("");
                      setActiveTopicName("");
                      setActiveCategory("");
                      setPdfLoading(false);
                      setPdfError(false);
                      setIsFocusMode(false);
                      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
                    }}
                    onPdfLoad={() => {
                      if (activePdfUrl) {
                        loadedPdfCacheRef.current.add(activePdfUrl);
                      }
                      setPdfLoading(false);
                    }}
                    onPdfError={() => { setPdfLoading(false); setPdfError(true); }}
                    onRetry={() => { setPdfError(false); setPdfLoading(true); }}
                  />
                ) : (

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
                                    {topicsList.filter(t => t.status === "pending").length > 1 && (
                                      <button
                                        onClick={handleAcceptAllSharedRequests}
                                        disabled={isAcceptingAll}
                                        style={{
                                          background: "linear-gradient(135deg, #10b981, #059669)",
                                          color: "#fff",
                                          border: "none",
                                          borderRadius: "8px",
                                          padding: "6px 12px",
                                          fontSize: "0.82rem",
                                          fontWeight: 700,
                                          cursor: isAcceptingAll ? "not-allowed" : "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "6px",
                                          opacity: isAcceptingAll ? 0.7 : 1,
                                          boxShadow: "0 4px 12px rgba(16,185,129,0.2)"
                                        }}
                                      >
                                        <CheckCircle size={14} />
                                        {isAcceptingAll ? "Accepting..." : "Accept All"}
                                      </button>
                                    )}
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
                                    <StudyHubTopicCard
                                      key={topic.classroom_id}
                                      topic={topic}
                                      index={index}
                                      themeColor="#2dd4bf"
                                      categoryLabel="Note"
                                      activeClassroomId={activeClassroomId}
                                      selectedResourceIds={selectedResourceIds}
                                      setSelectedResourceIds={setSelectedResourceIds}
                                      handlePreloadPdf={handlePreloadPdf}
                                      handleTopicClick={handleTopicClick}
                                      handleDeleteResource={handleDeleteResource}
                                      setShareResourceIds={setShareResourceIds}
                                      setShareTheme={setShareTheme}
                                    />
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
                                    <StudyHubTopicCard
                                      key={topic.classroom_id}
                                      topic={topic}
                                      index={index}
                                      themeColor="#fb923c"
                                      categoryLabel="Assignment"
                                      activeClassroomId={activeClassroomId}
                                      selectedResourceIds={selectedResourceIds}
                                      setSelectedResourceIds={setSelectedResourceIds}
                                      handlePreloadPdf={handlePreloadPdf}
                                      handleTopicClick={handleTopicClick}
                                      handleDeleteResource={handleDeleteResource}
                                      setShareResourceIds={setShareResourceIds}
                                      setShareTheme={setShareTheme}
                                    />
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
                                    <StudyHubTopicCard
                                      key={topic.classroom_id}
                                      topic={topic}
                                      index={index}
                                      themeColor="#818cf8"
                                      categoryLabel="Practical"
                                      activeClassroomId={activeClassroomId}
                                      selectedResourceIds={selectedResourceIds}
                                      setSelectedResourceIds={setSelectedResourceIds}
                                      handlePreloadPdf={handlePreloadPdf}
                                      handleTopicClick={handleTopicClick}
                                      handleDeleteResource={handleDeleteResource}
                                      setShareResourceIds={setShareResourceIds}
                                      setShareTheme={setShareTheme}
                                    />
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



          </div>
          );
        })()}
      </div>

        <AnimatePresence>
          {selectedResourceIds.length > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              style={{
                position: "fixed",
                bottom: 30,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(15, 23, 42, 0.95)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(56, 211, 153, 0.3)",
                padding: "12px 24px",
                borderRadius: "100px",
                display: "flex",
                alignItems: "center",
                gap: "20px",
                zIndex: 9999,
                boxShadow: "0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(56,211,153,0.15)"
              }}
            >
              <span style={{ color: "#fff", fontWeight: 600 }}>
                {selectedResourceIds.length} item{selectedResourceIds.length > 1 ? "s" : ""} selected
              </span>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => {
                    setShareResourceIds(selectedResourceIds);
                    setShareTheme("#38d399");
                    setSelectedResourceIds([]);
                  }}
                  style={{
                    background: "#38d399",
                    color: "#020c1b",
                    border: "none",
                    borderRadius: "100px",
                    padding: "8px 16px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <Share2 size={14} /> Share All
                </button>
                <button
                  onClick={() => setSelectedResourceIds([])}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "100px",
                    padding: "8px 16px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {authOpen && (
        <AuthModal open={authOpen} onClose={closeAuth} initialMode={entryMode} />
      )}

      {/* Modals */}
      <WhatsAppModal 
        isOpen={showWhatsappModal} 
        onClose={() => setShowWhatsappModal(false)} 
      />

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

      {shareResourceIds && userAcademicProfile && (
        <ShareResourceModal
          isOpen={!!shareResourceIds}
          onClose={() => setShareResourceIds(null)}
          resourceIds={shareResourceIds}
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
