"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import "../styles/Chatbot.css";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ClimbupAIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [contextQuestion, setContextQuestion] = useState("");
  const [theme, setTheme] = useState("dark");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  // Listen for the custom event to open the chatbot
  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsOpen(true);
      if (customEvent.detail?.question) {
        setContextQuestion(customEvent.detail.question);
      }
      if (customEvent.detail?.theme) {
        setTheme(customEvent.detail.theme);
      }
      
      // If first time opening, maybe add a greeting
      setMessages((prev) => {
        if (prev.length === 0) {
          return [
            {
              role: "assistant",
              content: "Hi there! I'm Climbup AI. How can I help you with this topic today?",
            },
          ];
        }
        return prev;
      });
    };

    window.addEventListener("climbup-ai-open", handleOpen);
    return () => window.removeEventListener("climbup-ai-open", handleOpen);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const userMsg: Message = { role: "user", content: userText };
    const updatedMessages = [...messages, userMsg];
    
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("You must be logged in to use Climbup AI.");
      }

      // Limit messages to last 10 for payload size optimization
      const payloadMessages = updatedMessages.slice(-10);

      // The backend URL from .env (fallback to hardcoded if env var fails)
      const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "https://bacend-climbup.onrender.com";

      const response = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: "Academic Discussion",
          context: contextQuestion,
          messages: payloadMessages,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success || data.reply) {
        // Handle variations in backend response format (data.reply or data.message etc)
        const replyText = data.reply || data.message || data.content || "Sorry, I couldn't process that.";
        setMessages((prev) => [...prev, { role: "assistant", content: replyText }]);
      } else {
        throw new Error("Invalid response format from AI");
      }
    } catch (error: any) {
      console.error("Chat failed:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${error.message || "Failed to get a response. Please try again."}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`chatbot-wrapper ${theme === "light" ? "theme-light" : "theme-dark"}`}>
      <div 
        className={`chatbot-overlay ${isOpen ? "is-open" : ""}`}  
        onClick={() => setIsOpen(false)}
      />
      
      <div className={`chatbot-drawer ${isOpen ? "is-open" : ""}`}>
        <div className="chatbot-header">
          <div className="chatbot-header-title">
            <h2>Climbup AI</h2>
            <span>Beta</span>
          </div>
          <button className="chatbot-close-btn" onClick={() => setIsOpen(false)} aria-label="Close Chat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="chatbot-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`chatbot-message-wrapper ${msg.role}`}>
              <div className="chatbot-message-role">{msg.role === "assistant" ? "Climbup AI" : "You"}</div>
              <div className={`chatbot-message ${msg.role}`}>
                {msg.content.split("\\n").map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="chatbot-message-wrapper assistant">
              <div className="chatbot-message-role">Climbup AI</div>
              <div className="chatbot-message assistant chatbot-typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chatbot-input-area">
          <input
            className="chatbot-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask a doubt..."
            disabled={isLoading}
          />
          <button 
            className="chatbot-send-btn" 
            onClick={sendMessage} 
            disabled={isLoading || !input.trim()}
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
