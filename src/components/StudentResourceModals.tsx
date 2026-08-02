"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { X, UploadCloud, Share2, CheckCircle, User, LogIn, Search, Plus, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateClimbUPFolder } from "@/lib/googleDriveHelper";

// --- Types ---
interface UserProfile {
  user_id: string;
  full_name: string;
  email?: string;
  profile_image: string | null;
  updated_at?: string;
}

// ============================================================================
// ADD RESOURCE MODAL — Direct to Student's Personal Google Drive
// ============================================================================
export function AddResourceModal({
  isOpen,
  onClose,
  subjectId,
  category,
  userId,
  universityId,
  branchId,
  semester,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  category: "assignment" | "practical" | "personal_document" | null;
  userId: string;
  universityId?: string;
  branchId?: string;
  semester?: number;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [needsGoogleConnect, setNeedsGoogleConnect] = useState(false);

  const supabase = createClient();

  if (!isOpen) return null;

  // Helper to get active Google access token (with silent refresh fallback)
  const getGoogleToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    let accessToken = session.provider_token;
    const refreshToken = session.provider_refresh_token;

    // Test existing access token
    if (accessToken) {
      try {
        const testRes = await fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (testRes.ok) return accessToken;
      } catch {
        // Token test failed, try refresh below
      }
    }

    // Try silent refresh if refresh token exists
    if (refreshToken) {
      try {
        const refreshRes = await fetch("/api/auth/refresh-google-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken })
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          if (data.accessToken) return data.accessToken;
        }
      } catch {
        // Silent refresh failed
      }
    }

    return null;
  };

  const handleConnectGoogle = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.href,
        },
      });
    } catch (err: any) {
      setError("Failed to launch Google sign-in. Please try again.");
    }
  };

  const handleUpload = async () => {
    if (!title.trim() || !file) {
      setError("Please provide a title and select a PDF file.");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError("File size cannot exceed 100 MB.");
      return;
    }

    setError("");
    setNeedsGoogleConnect(false);
    setUploading(true);

    try {
      // 1. Create FormData for the backend API route
      const form = new FormData();
      form.append("file", file);

      // 2. Upload file to our secure centralized Drive via Next.js
      const driveUploadRes = await fetch("/api/drive-upload", {
        method: "POST",
        body: form
      });

      const driveData = await driveUploadRes.json();

      if (!driveUploadRes.ok || !driveData.success) {
        throw new Error(driveData.error || "Google Drive upload failed");
      }

      const fileUrl = driveData.webViewLink;

      // 3. Save metadata to database (this keeps it visible in their profile)
      const { error: dbError } = await supabase
        .from("student_resources")
        .insert({
          user_id: userId,
          subject_id: subjectId,
          type: category,
          title: title.trim(),
          file_url: fileUrl
        });

      if (dbError) throw dbError;

      onSuccess();
      onClose();
      setTitle("");
      setFile(null);
    } catch (err: any) {
      console.error("Upload Error:", err);
      setError(err.message || "Failed to upload file to Google Drive.");
    } finally {
      setUploading(false);
    }
  };



  const themeColor = category === "assignment" ? "#fb923c" : category === "personal_document" ? "#2dd4bf" : "#818cf8";
  const bgGlow = category === "assignment" ? "rgba(251,146,60,0.15)" : category === "personal_document" ? "rgba(45,212,191,0.15)" : "rgba(129,140,248,0.15)";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(5px)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{ background: "#0f172a", border: `1px solid ${bgGlow}`, borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "450px", position: "relative", boxShadow: `0 0 30px ${bgGlow}` }}
      >
        <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
          <X size={20} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{ padding: 12, background: bgGlow, borderRadius: 12, color: themeColor }}>
            <UploadCloud size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>
              Add {category === "assignment" ? "Assignment" : category === "personal_document" ? "My Note" : "Practical"}
            </h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", marginTop: 4 }}>
              Upload PDF directly to your personal Google Drive.
            </p>
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "12px", borderRadius: "10px", fontSize: "0.85rem", marginBottom: "16px", lineHeight: "1.4" }}>
            {error}
          </div>
        )}

        {needsGoogleConnect ? (
          <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
            <button
              onClick={handleConnectGoogle}
              style={{
                width: "100%", padding: "14px", borderRadius: "10px",
                background: "linear-gradient(135deg, #4285F4, #34A853)",
                color: "#fff", fontWeight: 700, border: "none", cursor: "pointer",
                display: "flex", justifyContent: "center", alignItems: "center", gap: "10px",
                fontSize: "0.95rem", boxShadow: "0 4px 14px rgba(66,133,244,0.3)"
              }}
            >
              <LogIn size={18} /> Connect Google Drive Access
            </button>
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "12px" }}>
              One-click connection to allow ClimbUP to save PDFs directly to your personal <strong>ClimbUP</strong> Google Drive folder.
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", color: "#cbd5e1", fontSize: "0.9rem", marginBottom: "8px" }}>Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={`e.g. ${category === "assignment" ? "Assignment 1" : category === "personal_document" ? "My Physics Notes" : "Practical 1"}`}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none" }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", color: "#cbd5e1", fontSize: "0.9rem", marginBottom: "8px" }}>PDF File</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={e => setFile(e.target.files?.[0] || null)}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.2)", color: "#fff" }}
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading}
              style={{ width: "100%", padding: "12px", borderRadius: "8px", background: themeColor, color: "#000", fontWeight: 700, border: "none", cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.7 : 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
            >
              {uploading ? "Uploading to Google Drive..." : "Upload Resource"}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

// ============================================================================
// SHARE RESOURCE MODAL
// ============================================================================
export function ShareResourceModal({
  isOpen,
  onClose,
  resourceIds,
  currentUserId,
  currentUserName,
  universityId,
  branchId,
  semester,
  themeColor = "#38d399"
}: {
  isOpen: boolean;
  onClose: () => void;
  resourceIds: string[];
  currentUserId: string;
  currentUserName: string;
  universityId: string;
  branchId: string;
  semester: number;
  themeColor?: string;
}) {
  const [classmates, setClassmates] = useState<UserProfile[]>([]);
  const [pinnedUserIds, setPinnedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sharingTo, setSharingTo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      setSuccess(false);
      setError("");
      setSearchQuery("");
      fetchClassmates();
      fetchPinnedUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fetchPinnedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('pinned_classmates')
        .select('pinned_user_id')
        .eq('user_id', currentUserId);
      if (!error && data) {
        setPinnedUserIds(data.map((r: any) => r.pinned_user_id));
      }
    } catch (err) {
      console.warn("Could not fetch pinned users", err);
    }
  };

  // Sub-string match filtering (matches anywhere in name or email with zero DB requests)
  const filteredClassmates = useMemo(() => {
    if (!searchQuery.trim()) {
      // If no search query, ONLY show pinned users
      return classmates.filter(user => pinnedUserIds.includes(user.user_id));
    }
    const q = searchQuery.toLowerCase().trim();
    return classmates.filter(user =>
      user.full_name?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q)
    );
  }, [classmates, searchQuery, pinnedUserIds]);

  const fetchClassmates = async () => {
    setLoading(true);
    setError("");
    try {
      let resultData: UserProfile[] = [];

      // 1. Try RPC first if parameters are valid
      if (universityId && branchId && semester) {
        const { data, error } = await supabase.rpc('get_classmates', {
          p_university_id: universityId,
          p_branch_id: branchId,
          p_semester: semester
        });
        if (!error && data) resultData = data;
      }

      // 2. If RPC returned empty or errored/missing params, fallback to direct users query
      if (!resultData || resultData.length === 0) {
        const { data: dbUsers } = await supabase
          .from('users')
          .select('user_id, full_name, profile_image, updated_at')
          .neq('user_id', currentUserId)
          .limit(20);
        if (dbUsers) resultData = dbUsers as UserProfile[];
      }

      setClassmates(resultData || []);
    } catch (err: any) {
      console.warn("Classmates RPC warning, running fallback query:", err);
      try {
        const { data: dbUsers } = await supabase
          .from('users')
          .select('user_id, full_name, profile_image, updated_at')
          .neq('user_id', currentUserId)
          .limit(20);
        setClassmates((dbUsers as UserProfile[]) || []);
      } catch (fallbackErr) {
        console.error("Fallback error:", fallbackErr);
        setError("Failed to load classmates");
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePinClassmate = async (classmateId: string) => {
    const isPinned = pinnedUserIds.includes(classmateId);
    
    // Optimistic UI update
    setPinnedUserIds(prev => 
      isPinned ? prev.filter(id => id !== classmateId) : [...prev, classmateId]
    );

    try {
      if (isPinned) {
        // Unpin
        await supabase
          .from('pinned_classmates')
          .delete()
          .eq('user_id', currentUserId)
          .eq('pinned_user_id', classmateId);
      } else {
        // Pin
        await supabase
          .from('pinned_classmates')
          .insert({ user_id: currentUserId, pinned_user_id: classmateId });
      }
    } catch (err) {
      console.error("Failed to toggle pin state:", err);
      // Revert on error
      setPinnedUserIds(prev => 
        isPinned ? [...prev, classmateId] : prev.filter(id => id !== classmateId)
      );
    }
  };

  const handleShare = async (targetUserId: string) => {
    setSharingTo(targetUserId);
    setError("");
    try {
      await Promise.all(resourceIds.map(async (resId) => {
        const { data, error } = await supabase.rpc('share_student_resource', {
          p_resource_id: resId,
          p_target_user_id: targetUserId,
          p_sender_name: currentUserName
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || "Sharing failed");
      }));

      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to share resource(s)");
    } finally {
      setSharingTo(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(5px)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{ background: "#0f172a", border: `1px solid ${themeColor}40`, borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "450px", position: "relative", boxShadow: `0 0 30px ${themeColor}20` }}
      >
        <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
          <X size={20} />
        </button>

        <h3 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Share2 color={themeColor} /> Share with Classmate
        </h3>
        <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "20px" }}>
          Select a classmate to securely send {resourceIds?.length > 1 ? `a copy of these ${resourceIds.length} resources` : "a copy of this resource"} to their assignments.
        </p>

        {error && <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "10px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "16px" }}>{error}</div>}
        
        {/* Search Bar for Classmates */}
        {!success && classmates.length > 0 && (
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b", display: "flex", pointerEvents: "none" }}>
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search classmate by name..."
              style={{
                width: "100%",
                padding: "10px 36px 10px 38px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "10px",
                color: "#fff",
                fontSize: "0.88rem",
                fontFamily: "Inter, system-ui, sans-serif",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = themeColor}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", padding: 2 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {success ? (
          <div style={{ background: `${themeColor}20`, color: themeColor, padding: "20px", borderRadius: "8px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <CheckCircle size={32} />
            <strong>Shared Successfully!</strong>
            <span style={{ fontSize: "0.85rem" }}>The resource is now available in their account.</span>
          </div>
        ) : (
          <div style={{ height: "280px", overflowY: "auto", paddingRight: "5px", WebkitOverflowScrolling: "touch" }}>
            {loading ? (
              <p style={{ color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>Loading classmates...</p>
            ) : classmates.length === 0 ? (
              <p style={{ color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>No classmates found in your current semester.</p>
            ) : filteredClassmates.length === 0 && !searchQuery.trim() ? (
              <div style={{ textAlign: "center", padding: "30px 20px", color: "#94a3b8" }}>
                <div style={{ background: "rgba(255,255,255,0.05)", width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Search size={24} color="#64748b" />
                </div>
                <p style={{ margin: "0 0 8px", fontSize: "0.95rem", fontWeight: 500, color: "#cbd5e1" }}>No pinned classmates yet.</p>
                <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.5 }}>Search for your friends above and click the <strong>+</strong> icon to pin them here for quick sharing.</p>
              </div>
            ) : filteredClassmates.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8" }}>
                <p style={{ margin: "0 0 8px", fontSize: "0.9rem" }}>No classmate found matching &quot;{searchQuery}&quot;</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{ background: "none", border: "none", color: themeColor, cursor: "pointer", fontSize: "0.82rem", textDecoration: "underline" }}
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {filteredClassmates.map(user => {
                  const diffMs = user.updated_at ? Date.now() - new Date(user.updated_at).getTime() : 0;
                  const diffMins = Math.floor(diffMs / (1000 * 60));
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                  let activeLabel = "Active";
                  let isHot = true;

                  if (user.updated_at) {
                    if (diffMins < 60) {
                      activeLabel = `Active ${Math.max(1, diffMins)}m ago`;
                      isHot = true;
                    } else if (diffHours < 24) {
                      activeLabel = `Active ${diffHours}h ago`;
                      isHot = true;
                    } else {
                      activeLabel = `Active ${diffDays}d ago`;
                      isHot = diffDays <= 3;
                    }
                  }

                  return (
                    <div
                      key={user.user_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(255,255,255,0.03)",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1px solid rgba(255,255,255,0.06)",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ position: "relative" }}>
                          {user.profile_image ? (
                            <img src={user.profile_image} alt={user.full_name} style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: `${themeColor}20`, border: `1px solid ${themeColor}40`, display: "flex", alignItems: "center", justifyContent: "center", color: themeColor, fontWeight: 700, fontSize: "0.9rem" }}>
                              {user.full_name ? user.full_name.charAt(0).toUpperCase() : <User size={16} />}
                            </div>
                          )}
                          {/* Active Indicator Dot */}
                          <span
                            style={{
                              position: "absolute",
                              bottom: 0,
                              right: 0,
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              background: isHot ? "#10b981" : "#64748b",
                              border: "2px solid #0f172a"
                            }}
                          />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "0.92rem" }}>{user.full_name}</span>
                            <span
                              style={{
                                fontSize: "0.62rem",
                                background: isHot ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
                                color: isHot ? "#10b981" : "#94a3b8",
                                border: `1px solid ${isHot ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)"}`,
                                padding: "1px 6px",
                                borderRadius: "100px",
                                fontWeight: 700
                              }}
                            >
                              {activeLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePinClassmate(user.user_id); }}
                          title={pinnedUserIds.includes(user.user_id) ? "Unpin classmate" : "Pin classmate"}
                          style={{
                            background: pinnedUserIds.includes(user.user_id) ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
                            color: pinnedUserIds.includes(user.user_id) ? "#10b981" : "#94a3b8",
                            border: `1px solid ${pinnedUserIds.includes(user.user_id) ? "rgba(16,185,129,0.3)" : "transparent"}`,
                            borderRadius: "8px",
                            padding: "6px 8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s"
                          }}
                        >
                          {pinnedUserIds.includes(user.user_id) ? <Check size={16} /> : <Plus size={16} />}
                        </button>
                        <button
                          onClick={() => handleShare(user.user_id)}
                          disabled={sharingTo === user.user_id}
                          style={{
                            background: themeColor,
                            color: "#020c1b",
                            border: "none",
                            borderRadius: "8px",
                            padding: "7px 14px",
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            cursor: sharingTo === user.user_id ? "not-allowed" : "pointer",
                            opacity: sharingTo === user.user_id ? 0.7 : 1,
                            boxShadow: `0 4px 12px ${themeColor}30`,
                          }}
                        >
                          {sharingTo === user.user_id ? "Sending..." : "Share"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
