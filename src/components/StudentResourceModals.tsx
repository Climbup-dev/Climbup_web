"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, UploadCloud, Share2, CheckCircle, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
// Dynamically import pdfjs inside the handler to prevent SSR errors (DOMMatrix is not defined)
// --- Types ---
interface UserProfile {
  user_id: string;
  full_name: string;
  profile_image: string | null;
}

// ============================================================================
// ADD RESOURCE MODAL
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

  const supabase = createClient();

  if (!isOpen) return null;

  const handleUpload = async () => {
    if (!title.trim() || !file) {
      setError("Please provide a title and select a PDF file.");
      return;
    }
    setError("");
    setUploading(true);

    let skipAiProcessing = false;

    try {
      if (category === "personal_document") {
        // 1. Validate File Size (> 20MB)
        if (file.size > 20 * 1024 * 1024) {
          const proceed = window.confirm("This PDF exceeds the 20MB limit. Our AI agent currently does not support very large files (we are improving this). Do you want to upload and store it anyway without AI features?");
          if (!proceed) {
            setUploading(false);
            return;
          }
          skipAiProcessing = true;
        }

        // 2. Validate PDF Pages (> 80 pages)
        if (!skipAiProcessing) {
          try {
            const pdfjsLib = await import("pdfjs-dist");
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
            const pdfDocument = await loadingTask.promise;
            if (pdfDocument.numPages > 80) {
              const proceed = window.confirm("This PDF has more than 80 pages. Our AI agent currently does not support very long files (we are improving this). Do you want to upload and store it anyway without AI features?");
              if (!proceed) {
                setUploading(false);
                return;
              }
              skipAiProcessing = true;
            }
          } catch (pdfErr) {
            console.error("PDF Parsing Error:", pdfErr);
            setError("Failed to read PDF file. Please ensure it is a valid PDF.");
            setUploading(false);
            return;
          }
        }
      }

      // 1. ALWAYS Upload file to Supabase storage bucket first (for all types)
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${userId}/${subjectId}/${category}s/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('student_files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: urlData } = supabase.storage
        .from('student_files')
        .getPublicUrl(filePath);

      // 3. ALWAYS Insert into student_resources database (so it's safely stored as a fallback)
      const { error: dbError } = await supabase
        .from('student_resources')
        .insert({
          user_id: userId,
          subject_id: subjectId,
          type: category,
          title: title,
          file_url: urlData.publicUrl
        });

      if (dbError) throw dbError;

      // 4. IF it's a 'personal_document', ALSO send it to the Render Microservice for AI vectorization
      if (category === "personal_document" && !skipAiProcessing) {
        // Construct FormData for Render
        const formData = new FormData();
        formData.append("file", file);
        formData.append("subject_id", subjectId);
        formData.append("topic_title", title);
        if (universityId) formData.append("university_id", universityId);
        if (branchId) formData.append("branch_id", branchId);
        if (semester) formData.append("semester_id", semester.toString());
        // Pass the Supabase URL just in case Render backend wants to use it
        formData.append("pdf_url", urlData.publicUrl);

        // Get JWT Token and make API Request
        const { data: { session } } = await supabase.auth.getSession();
        const jwtToken = session?.access_token;
        
        if (!jwtToken) {
          setError("File saved to Supabase, but AI Processing failed: Session expired.");
          setUploading(false);
          return;
        }
        
        const res = await fetch("https://climbup-class-agent.onrender.com/api/v1/upload-smart", {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          },
          body: formData,
        });

        if (res.status === 429) {
          setError("File saved, but AI daily limit reached (429).");
          setUploading(false);
          return;
        }

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          setError(`File saved successfully, but AI Processing failed (${res.status}).`);
          setUploading(false);
          return;
        }
      }

      onSuccess();
      onClose();
      setTitle("");
      setFile(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to upload resource");
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
              Upload a PDF file to share or store.
            </p>
          </div>
        </div>

        {error && <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "10px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "16px" }}>{error}</div>}

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
          {uploading ? "Uploading..." : "Upload Resource"}
        </button>
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
  resourceId,
  currentUserId,
  currentUserName,
  universityId,
  branchId,
  semester,
  themeColor = "#38d399"
}: {
  isOpen: boolean;
  onClose: () => void;
  resourceId: string;
  currentUserId: string;
  currentUserName: string;
  universityId: string;
  branchId: string;
  semester: number;
  themeColor?: string;
}) {
  const [classmates, setClassmates] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharingTo, setSharingTo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      setSuccess(false);
      setError("");
      fetchClassmates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fetchClassmates = async () => {
    setLoading(true);
    try {
      // Fetch classmates using our secure RPC function to bypass any RLS/View issues
      const { data, error } = await supabase.rpc('get_classmates', {
        p_university_id: universityId,
        p_branch_id: branchId,
        p_semester: semester
      });

      if (error) throw error;
      setClassmates(data || []);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load classmates");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (targetUserId: string) => {
    setSharingTo(targetUserId);
    setError("");
    try {
      // Call our secure RPC function with sender's name
      const { data, error } = await supabase.rpc('share_student_resource', {
        p_resource_id: resourceId,
        p_target_user_id: targetUserId,
        p_sender_name: currentUserName
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Sharing failed");

      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to share resource");
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
          Select a classmate to securely send a copy of this resource to their assignments.
        </p>

        {error && <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "10px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "16px" }}>{error}</div>}
        
        {success ? (
          <div style={{ background: `${themeColor}20`, color: themeColor, padding: "20px", borderRadius: "8px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <CheckCircle size={32} />
            <strong>Shared Successfully!</strong>
            <span style={{ fontSize: "0.85rem" }}>The resource is now available in their account.</span>
          </div>
        ) : (
          <div style={{ maxHeight: "300px", overflowY: "auto", paddingRight: "5px" }}>
            {loading ? (
              <p style={{ color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>Loading classmates...</p>
            ) : classmates.length === 0 ? (
              <p style={{ color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>No classmates found in your current semester.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {classmates.map(user => (
                  <div key={user.user_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {user.profile_image ? (
                        <img src={user.profile_image} alt={user.full_name} style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#cbd5e1" }}>
                          <User size={16} />
                        </div>
                      )}
                      <span style={{ color: "#f1f5f9", fontWeight: 500, fontSize: "0.95rem" }}>{user.full_name}</span>
                    </div>
                    <button
                      onClick={() => handleShare(user.user_id)}
                      disabled={sharingTo === user.user_id}
                      style={{ background: themeColor, color: "#000", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", opacity: sharingTo === user.user_id ? 0.7 : 1 }}
                    >
                      {sharingTo === user.user_id ? "Sending..." : "Share"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
