"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Book, Send, Calculator, Binary, Atom } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useClassroomChat, ChatMessage } from "@/hooks/useClassroomChat";
import ClassSelector, { ClassSelection } from "@/components/ClassSelector";
import { createClient } from "@/lib/supabase/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "@/styles/StudyHub.css";

export interface Subject {
  id: string;
  subject_name: string;
}

interface ClassroomResponse {
  status: string;
  classroom_id: string;
  topic_name?: string;
  detail?: string;
  pdf_url?: string;
}

export interface Topic {
  classroom_id: string;
  topic_name: string;
  status?: string;
  created_at?: string;
  pdf_url?: string;
}

const AuthModal = dynamic(() => import("@/components/AuthModal"), {
  ssr: false,
  loading: () => null,
});

export default function StudyHubContent() {
  const { currentUser, loading, passwordRecovery } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<"login" | "register">("login");
  
  const [isChatOpen, setIsChatOpen] = useState(true);
  
  const [hubState, setHubState] = useState<'selection' | 'welcome' | 'hub'>('selection');
  const [classInfo, setClassInfo] = useState<ClassSelection | null>(null);
  
  const [activeClassroomId, setActiveClassroomId] = useState("");
  const [activePdfUrl, setActivePdfUrl] = useState("");
  const [activeTopicName, setActiveTopicName] = useState("");
  const [isFetchingClassroom, setIsFetchingClassroom] = useState(false);

  const [activeSubject, setActiveSubject] = useState("");
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  
  const [topicsList, setTopicsList] = useState<Topic[]>([]);
  const [isFetchingTopics, setIsFetchingTopics] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_CLASS_AGENT_URL || "https://climbup-class-agent.onrender.com";

  // Mock notes just for visual placeholders
  const MOCK_NOTES = [
    { id: 1, title: "Unit 1: Fundamentals", subjectId: "math", type: "pdf", author: "Dr. Smith", date: "2 days ago" },
    { id: 2, title: "Midterm Prep Questions", subjectId: "physics", type: "doc", author: "Prof. Johnson", date: "1 week ago" }
  ];

  const supabase = React.useMemo(() => createClient(), []);

  const fetchSubjects = async (universityId: string, branchId: string, semester: number): Promise<void> => {
    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('subject_id, subject_name, subject_code, semester')
      .eq('university_id', universityId)
      .eq('branch_id', branchId)
      .eq('semester', String(semester))
      .order('subject_name', { ascending: true });
      
    if (error) {
      console.error("Error fetching subjects:", error);
      return;
    }
    
    if (subjects) {
      const mapped = subjects.map((s: any) => ({
        id: s.subject_id,
        subject_name: s.subject_name
      }));
      setSubjectsList(mapped as Subject[]);
      
      // Auto-connect to the first subject if available
      if (mapped.length > 0) {
        handleSubjectClick(mapped[0].id);
      }
    }
  };

  const handleSubjectClick = async (subjectId: string): Promise<void> => {
    setActiveSubject(subjectId);
    setIsFetchingTopics(true);
    setActiveClassroomId("");
    setActiveTopicName("");
    setActivePdfUrl("");
    setTopicsList([]);

    try {
      const supabaseNew = createSupabaseClient('https://yjqxsfoynpihyawewdrf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqcXhzZm95bnBpaHlhd2V3ZHJmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDEwNzI5MSwiZXhwIjoyMDk5NjgzMjkxfQ.caYe7pK8WvoTiYBGdkg9h8xyaw2RCDZ04p3Lk1avAOA');
      const { data, error } = await supabaseNew
        .from('classrooms')
        .select('*')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      if (data && data.length > 0) {
         const topics = data.map((row: any) => ({
             classroom_id: row.id,
             topic_name: row.topic_name || 'General Topic',
             pdf_url: row.pdf_url || '',
             created_at: row.created_at
         }));
         setTopicsList(topics);
      } else {
         console.warn("No topics found for subject");
      }
    } catch (error) {
      console.warn("Failed to fetch topics for subject", error);
    } finally {
      setIsFetchingTopics(false);
    }
  }

  const handleTopicClick = (topic: Topic) => {
    setActiveClassroomId(topic.classroom_id);
    setActiveTopicName(topic.topic_name || "");
    setActivePdfUrl(topic.pdf_url || "");
  };

  const [personalMessages, setPersonalMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const studentId = currentUser?.id || "";
  const studentName = currentUser?.user_metadata?.full_name || currentUser?.email?.split("@")[0] || "Student";
  const classroomId = activeClassroomId;

  const handleMessageReceived = useCallback((msg: ChatMessage) => {
    setPersonalMessages(prev => [...prev, msg]);
  }, []);

  const { sendMessage: sendWsMessage, status: connectionStatus } = useClassroomChat({
    classroomId,
    mode: "personal",
    studentId,
    studentName,
    onMessageReceived: handleMessageReceived
  });

  const chatScrollRef = useRef<HTMLDivElement>(null);

  const requiresLogin = !loading && !currentUser;

  const openAuth = (mode: "login" | "register") => {
    setEntryMode(mode);
    setAuthOpen(true);
  };

  const closeAuth = () => {
    setAuthOpen(false);
    if (!currentUser) {
      window.location.assign("/");
    }
  };

  // Scroll to bottom when messages change
  const currentMessages = personalMessages;
  
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [currentMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    sendWsMessage(newMessage);

    // Optimistically add to UI
    const newMsg: ChatMessage = {
      id: Date.now(),
      type: 'chat',
      sender: studentName || 'You',
      content: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
      isAi: false
    };

    setPersonalMessages(prev => [...prev, newMsg]);

    setNewMessage("");
  };

  const currentSubjectName = subjectsList.find(s => s.id === activeSubject)?.subject_name || "Select a Subject";
  const filteredNotes = MOCK_NOTES.filter(n => n.subjectId === activeSubject || activeSubject === "all");

  const handleJoinClass = async (selection: ClassSelection) => {
    setClassInfo(selection);
    setHubState('welcome');
    
    // SAVE TO DATABASE TO SATISFY RLS!
    if (currentUser?.id) {
      await supabase
        .from("users")
        .update({
          university_id: selection.universityId,
          branch_id: selection.branchId,
          semester: String(selection.semester),
        })
        .eq("user_id", currentUser.id);
    }
    
    await fetchSubjects(selection.universityId, selection.branchId, selection.semester);

    setTimeout(() => {
      setHubState('hub');
    }, 2500); // Wait 2.5 seconds before transitioning to the hub
  };

  return (
    <>
      <Navbar
        onLogin={() => openAuth("login")}
        onSignUp={() => openAuth("register")}
      />
      <div className="study-hub-container">
        
        {hubState === 'selection' && (
          <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <ClassSelector userId={currentUser?.id || ""} onJoinClass={handleJoinClass} />
          </div>
        )}

        {hubState === 'welcome' && classInfo && (
          <div className="study-hub-welcome-screen">
            <h1>Welcome to {classInfo.universityName}</h1>
            <p>{classInfo.branchName} • Semester {classInfo.semester}</p>
            <div className="spinner"></div>
          </div>
        )}

        {hubState === 'hub' && (
          <div className="study-hub-main-fade-in" style={{ display: 'flex', width: '100%', height: '100%' }}>
            {/* Left Slider: Sidebar */}
            <aside className="study-hub-sidebar">
          <div className="sidebar-header">
            <h2>Subjects</h2>
          </div>
          <nav className="sidebar-nav">
            {subjectsList.length === 0 ? (
              <div style={{ padding: '20px', color: '#a0aec0', fontSize: '14px', textAlign: 'center' }}>
                No subjects found for this selection.
              </div>
            ) : (
              subjectsList.map((subject) => {
                return (
                  <button
                    key={subject.id}
                    className={`subject-btn ${activeSubject === subject.id ? "active" : ""}`}
                    onClick={() => handleSubjectClick(subject.id)}
                  >
                    <div className="subject-icon">
                      <Book size={18} />
                    </div>
                    <span>{subject.subject_name}</span>
                  </button>
                );
              })
            )}
          </nav>
        </aside>

            {/* Center Console: Content */}
            <main className="study-hub-center">
              <div className="center-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="header-title">
                  <h1>{currentSubjectName}</h1>
                  {isFetchingTopics ? (
                    <p style={{ color: '#fbbf24', fontWeight: 500 }}>Loading topics...</p>
                  ) : activeTopicName ? (
                    <p style={{ color: '#38d399', fontWeight: 500 }}>Active Topic: {activeTopicName}</p>
                  ) : (
                    <p style={{ color: '#94a3b8', fontWeight: 500 }}>Select a topic below.</p>
                  )}
                </div>
                {activeClassroomId && (
                  <button 
                    onClick={() => window.open(`/classroom/${activeClassroomId}`, '_blank')}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    Join Live Classroom
                  </button>
                )}
              </div>

              {activeClassroomId && activePdfUrl ? (
                <div style={{ flex: 1, padding: '0 40px 40px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(0,0,0,0.2)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                    <iframe
                      src={activePdfUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 'none', backgroundColor: '#fff' }}
                      title="Classroom Material"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ padding: '0 40px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px' }}>Topics</h2>
                  </div>
                  
                  {isFetchingTopics ? (
                    <div style={{ padding: '0 40px', color: '#a0aec0' }}>Loading topics...</div>
                  ) : topicsList.length > 0 ? (
                    <div className="notes-grid">
                      {topicsList.map(topic => (
                        <div key={topic.classroom_id} className="note-card" onClick={() => handleTopicClick(topic)} style={{ cursor: 'pointer' }}>
                          <div className="note-header">
                            <h3 className="note-title">{topic.topic_name}</h3>
                            <span className="note-badge">{topic.status ? topic.status.toUpperCase() : "ACTIVE"}</span>
                          </div>
                          <p className="note-desc">
                            {topic.created_at ? `Created on ${new Date(topic.created_at).toLocaleDateString()}` : "Click to view material and chat"}
                          </p>
                          <div className="note-footer">
                            <div className="note-author">
                              <div className="author-avatar"><Book size={14} /></div>
                              <span>Classroom</span>
                            </div>
                            <button className="read-btn">
                              Open <span>→</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '0 40px', color: '#a0aec0' }}>No topics available for this subject yet.</div>
                  )}
                </>
              )}
            </main>

            {/* Right Panel: Chat interface (only show if activeClassroomId exists) */}
            <aside className={`study-hub-chat ${!activeClassroomId ? "collapsed" : ""}`}>
              <div className="chat-header" style={{ justifyContent: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Atom size={18} color="#38d399" />
                  Personal AI Tutor
                </h3>
              </div>

              <div className="chat-messages" ref={chatScrollRef}>
                {currentMessages.length === 0 && (
                  <div className="empty-chat">
                    <p>No messages yet.</p>
                  </div>
                )}
                {currentMessages.map((msg) => (
                  <div key={msg.id} className={`message ${msg.isOwn ? 'own' : msg.isAi ? 'ai' : 'other'}`}>
                    <div className="message-avatar">
                      {msg.isOwn ? "Me" : msg.isAi ? "AI" : msg.sender?.charAt(0).toUpperCase()}
                    </div>
                    <div className="message-content">
                      <div className="message-header">
                        <span className="message-sender">{msg.isOwn ? 'You' : msg.sender}</span>
                        <span className="message-time">{msg.timestamp}</span>
                      </div>
                      <div className="message-bubble markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="chat-input-container">
                <form onSubmit={handleSendMessage} style={{ display: 'flex', width: '100%', gap: '12px' }}>
                  <div className="chat-input-wrapper">
                    <input
                      className="chat-input"
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Ask AI Tutor..."
                      disabled={connectionStatus !== 'CONNECTED'}
                    />
                  </div>
                  <button className="send-btn" type="submit" disabled={!newMessage.trim() || connectionStatus !== 'CONNECTED'}>
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </aside>
          </div>
        )}
      </div>

      {authOpen && (
        <AuthModal
          onClose={closeAuth}
          defaultMode={entryMode}
          passwordRecovery={passwordRecovery}
        />
      )}
    </>
  );
}
