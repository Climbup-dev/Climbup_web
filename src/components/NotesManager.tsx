"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { fetchApi } from "@/lib/api";

interface Note {
  id: string;
  title: string;
  file_url: string;
  created_at: string;
}

export default function NotesManager() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      // Placeholder endpoint - update this when the real backend endpoint is ready
      const data = await fetchApi("/api/notes");
      if (Array.isArray(data)) {
        setNotes(data);
      }
    } catch (err: any) {
      console.error("Failed to load notes, using empty state", err);
      // We don't show a hard error here to keep the UI clean if the endpoint isn't ready
      // setError(err.message || "Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      // Optional: Add metadata if backend requires it
      // formData.append("title", file.name);

      // Note: We use standard fetch here because the endpoint is on our local Next.js server,
      // not the external Python backend (which fetchApi targets by default).
      const response = await fetch("/api/drive-upload", {
        method: "POST",
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to upload note");
      }

      // Add the newly uploaded note to the local state so the user sees it immediately
      const newNote: Note = {
        id: result.fileId,
        title: file.name,
        file_url: result.webViewLink || "#",
        created_at: new Date().toISOString()
      };
      
      setNotes((prev) => [newNote, ...prev]);
    } catch (err: any) {
      setError(err.message || "Failed to upload note");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="wa-linking-container" style={{ marginTop: '40px' }}>
      <div className="profileSectionHeading">
        <div>
          <span>Resources</span>
          <h2>My Notes</h2>
        </div>
        <button onClick={loadNotes} disabled={loading} style={{ background: 'transparent', border: 'none', color: '#9ef8dc', cursor: 'pointer' }}>
          <RefreshCw size={20} className={loading ? "spin" : ""} />
        </button>
      </div>

      <div className="wa-linking-card" style={{ padding: '24px', alignItems: 'stretch' }}>
        
        {error && (
          <div className="wa-error" style={{ marginBottom: '20px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{ 
            border: '2px dashed rgba(158, 248, 220, 0.3)', 
            borderRadius: '16px', 
            padding: '32px', 
            textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            background: 'rgba(255,255,255,0.02)',
            transition: 'background 0.2s ease',
            marginBottom: '24px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
            accept=".pdf,.doc,.docx,.txt"
            disabled={uploading}
          />
          {uploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <Loader2 size={32} className="spin" color="#38d399" />
              <p style={{ margin: 0, color: 'rgba(234, 252, 246, 0.7)' }}>Uploading your note...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(56, 211, 153, 0.1)', padding: '16px', borderRadius: '50%', color: '#38d399' }}>
                <UploadCloud size={32} />
              </div>
              <h3 style={{ margin: 0, color: '#fff' }}>Click to Upload Notes</h3>
              <p style={{ margin: 0, color: 'rgba(234, 252, 246, 0.5)', fontSize: '14px' }}>PDF, DOCX, or TXT (Max 10MB)</p>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          {loading && notes.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', margin: '20px 0' }}>Loading notes...</p>
          ) : notes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)' }}>No notes uploaded yet.</p>
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(158, 248, 220, 0.1)', borderRadius: '12px' }}>
                <div style={{ color: '#9ef8dc' }}>
                  <FileText size={24} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {note.title}
                  </h4>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                    {new Date(note.created_at).toLocaleDateString()}
                  </p>
                </div>
                <a 
                  href={note.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ padding: '8px 16px', background: 'rgba(56, 211, 153, 0.1)', color: '#9ef8dc', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' }}
                >
                  View
                </a>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
