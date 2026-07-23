"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, Users, ArrowLeft, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DynamicBackground } from "@/components/DynamicBackground";
import { useAuth } from "@/hooks/useAuth";
import { useClassroomChat, ChatMessage } from "@/hooks/useClassroomChat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "@/styles/StudyHub.css";
import "@/styles/Classroom.css";
import "katex/dist/katex.min.css";

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
            style={{ color: "#60a5fa", fontSize: "0.78rem", textDecoration: "underline", wordBreak: "break-all" }}>
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
        src={src}
        alt={alt || "Diagram"}
        className={`md-image-tag ${loaded ? "loaded" : ""}`}
        style={loaded ? {} : { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain" }}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </span>
  );
};

const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const nowIST = new Date(utc + 5.5 * 3600000);
      let target = new Date(nowIST);
      target.setHours(20, 0, 0, 0);
      if (nowIST.getHours() >= 20) target.setDate(target.getDate() + 1);
      const diff = target.getTime() - nowIST.getTime();
      if (diff <= 0) { window.location.reload(); return; }
      setTimeLeft({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
      setIsReady(true);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);

  if (!isReady) return null;

  const Block = ({ val, label }: { val: number; label: string }) => (
    <div style={{ background: "rgba(0,0,0,0.4)", padding: "14px 22px", borderRadius: 16, textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "#38d399" }}>{String(val).padStart(2, "0")}</div>
      <div style={{ fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 14, marginTop: 32, justifyContent: "center", alignItems: "center" }}>
      <Block val={timeLeft.hours} label="Hours" />
      <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "#64748b" }}>:</div>
      <Block val={timeLeft.minutes} label="Min" />
      <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "#64748b" }}>:</div>
      <Block val={timeLeft.seconds} label="Sec" />
    </div>
  );
};

const chatBubbleVariants = {
  hidden: { opacity: 0, y: 22, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring" as const, stiffness: 420, damping: 32 },
  },
};

export default function ClassroomClient({ id }: { id: string }) {
  const { currentUser, loading } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [wsBoard, setWsBoard] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [isTimeClosed, setIsTimeClosed] = useState(false);

  const studentId = currentUser?.id || "";
  const studentName = currentUser?.user_metadata?.full_name || currentUser?.email?.split("@")[0] || "Student";

  const pdfUrl = `https://yjqxsfoynpihyawewdrf.supabase.co/storage/v1/object/public/class_materials/${id}.pdf`;

  useEffect(() => {
    setIsTimeClosed(false);
    const intervalId = setInterval(() => setIsTimeClosed(false), 60000);
    return () => clearInterval(intervalId);
  }, []);

  const handleMessageReceived = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const { sendMessage: sendWsMessage, status: connectionStatus, closedInfo } = useClassroomChat({
    classroomId: id,
    mode: "group",
    studentId,
    studentName,
    onMessageReceived: handleMessageReceived,
    onBoardUpdate: setWsBoard,
  });

  const effectivelyClosed = closedInfo?.isClosed || isTimeClosed;

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendWsMessage(newMessage);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "chat",
        sender: studentName || "You",
        content: newMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isOwn: true,
        isAi: false,
      },
    ]);
    setNewMessage("");
  };

  if (loading)
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#020c1b", color: "#fff", fontFamily: "Inter,sans-serif" }}>
        Loading…
      </div>
    );

  const badge = (() => {
    if (effectivelyClosed) return { bg: "rgba(239,68,68,.15)", color: "#ef4444", border: "rgba(239,68,68,.3)", label: "CLOSED" };
    if (connectionStatus === "CONNECTED") return { bg: "rgba(56,211,153,.15)", color: "#38d399", border: "rgba(56,211,153,.3)", label: "LIVE" };
    return { bg: "rgba(251,191,36,.15)", color: "#fbbf24", border: "rgba(251,191,36,.3)", label: connectionStatus };
  })();

  return (
    <div className="classroom-container" style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", color: "#fff", overflow: "hidden", background: "transparent" }}>
      <DynamicBackground subjectName="Classroom" />

      <div style={{
        padding: "14px 32px",
        background: "rgba(2,12,22,0.92)",
        backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(56,211,153,0.12)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
        boxShadow: "0 4px 30px rgba(0,0,0,0.5)",
        zIndex: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => window.close()}
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#a0aec0", transition: "all 0.2s" }}
          >
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.18rem", fontWeight: 700, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
              <Users size={19} color="#38d399" />
              Climbup EduTainment Live! 🎭💻
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#475569" }}>
              Where Tech meets Fun &nbsp;·&nbsp; Class ID: {id}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Status:</span>
          <motion.span
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ fontSize: "0.73rem", fontWeight: 700, padding: "4px 12px", borderRadius: 100, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, letterSpacing: "0.08em" }}
          >
            {badge.label}
          </motion.span>
        </div>
      </div>

      {effectivelyClosed ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}
        >
          <div style={{ background: "rgba(15,23,42,0.6)", padding: 48, borderRadius: 24, border: "1px solid rgba(239,68,68,0.2)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", maxWidth: 580, width: "100%" }}>
            <h2 style={{ fontSize: "2rem", color: "#f87171", marginTop: 0, marginBottom: 16 }}>Live Class is Closed</h2>
            <p style={{ fontSize: "1.05rem", color: "#cbd5e1", lineHeight: 1.6, marginBottom: 28 }}>
              {closedInfo?.message || "The live group classroom is only open between 8:00 PM and 9:00 PM (IST)."}
            </p>
            <CountdownTimer />
            <button onClick={() => window.close()} style={{ marginTop: 36, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: "13px 26px", borderRadius: 12, color: "#fff", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <ArrowLeft size={15} /> Go Back
            </button>
          </div>
        </motion.div>
      ) : (
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          
          <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column" }}>
             <div style={{ flex: 1, background: "rgba(15,23,42,0.7)", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
                <iframe 
                  src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  title="Class Material PDF"
                />
             </div>
          </div>

          <div className="live-chat-area" style={{ width: 380, borderLeft: "1px solid rgba(255,255,255,0.05)", background: "rgba(2,12,22,0.85)", backdropFilter: "blur(20px)", display: "flex", flexDirection: "column" }}>
            <div className="chat-header">
              <MessageSquare size={14} color="#60a5fa" />
              <span className="chat-header-title">Live Q&amp;A</span>
              <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "#1e3a5f" }}>Ask doubts here</span>
            </div>

            <div ref={chatScrollRef} className="messages-scroll">
              {messages.length === 0 && (
                <div style={{ margin: "auto", textAlign: "center", color: "#1e3a5f" }}>
                  <MessageSquare size={30} style={{ marginBottom: 10, opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: "0.82rem" }}>Welcome! Ask a doubt anytime.</p>
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  if (msg.type === "system" || msg.sender === "System") {
                    return (
                      <motion.div
                        key={msg.id}
                        variants={chatBubbleVariants}
                        initial="hidden"
                        animate="visible"
                        style={{ display: "flex", justifyContent: "center" }}
                      >
                        <div className="chat-bubble-system">{msg.content}</div>
                      </motion.div>
                    );
                  }

                  const bubbleClass = msg.isOwn ? "chat-bubble-own" : msg.isAi ? "chat-bubble-ai ai-bubble-glow" : "chat-bubble-other";

                  return (
                    <motion.div
                      key={msg.id}
                      variants={chatBubbleVariants}
                      initial="hidden"
                      animate="visible"
                      style={{
                        display: "flex",
                        gap: 7,
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
                        background: msg.isOwn ? "linear-gradient(135deg,#10b981,#059669)" : msg.isAi ? "rgba(96,165,250,.15)" : "rgba(255,255,255,.07)",
                        color: msg.isOwn ? "#fff" : msg.isAi ? "#60a5fa" : "#e2e8f0",
                        boxShadow: msg.isOwn ? "0 3px 10px rgba(16,185,129,.3)" : "none",
                        border: msg.isAi ? "1px solid rgba(96,165,250,.2)" : "1px solid rgba(255,255,255,.05)",
                      }}>
                        {msg.isOwn ? "Me" : msg.isAi ? "AI" : msg.sender?.charAt(0).toUpperCase()}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: msg.isOwn ? "flex-end" : "flex-start", maxWidth: "82%" }}>
                        <div style={{ fontSize: "0.67rem", fontWeight: 600, color: msg.isOwn ? "#38d399" : msg.isAi ? "#60a5fa" : "#64748b", marginBottom: 4, opacity: 0.9 }}>
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
            </div>

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
                    placeholder={connectionStatus === "CONNECTED" ? "Ask a doubt…" : "Connecting…"}
                    style={{ flex: 1, background: "transparent", border: "none", color: "#f8fafc", fontSize: "0.875rem", outline: "none", padding: "7px 0" }}
                    disabled={connectionStatus !== "CONNECTED"}
                  />
                  <motion.button
                    type="submit"
                    disabled={!newMessage.trim() || connectionStatus !== "CONNECTED"}
                    whileHover={newMessage.trim() ? { scale: 1.12 } : {}}
                    whileTap={newMessage.trim() ? { scale: 0.92 } : {}}
                    style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: newMessage.trim() ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,.06)",
                      border: "none", color: newMessage.trim() ? "#fff" : "#475569",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: !newMessage.trim() || connectionStatus !== "CONNECTED" ? "not-allowed" : "pointer",
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
          </div>
        </div>
      )}
    </div>
  );
}
