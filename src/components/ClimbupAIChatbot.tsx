"use client";

import { useState, useEffect, useRef, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/client";
import "../styles/Chatbot.css";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const TypewriterMessage = memo(({ content, animate, onUpdate }: { content: string, animate: boolean, onUpdate?: () => void }) => {
  const [displayedContent, setDisplayedContent] = useState(animate ? "" : content);

  const [isTyping, setIsTyping] = useState(animate);

  useEffect(() => {
    if (!animate) {
      setDisplayedContent(content);
      setIsTyping(false);
      return;
    }
    
    let i = 0;
    setIsTyping(true);
    const interval = setInterval(() => {
      if (i < content.length) {
        i += 4; // typing speed
        setDisplayedContent(content.slice(0, i));
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 15);
    
    return () => clearInterval(interval);
  }, [content, animate]);

  useEffect(() => {
    if (onUpdate) {
      onUpdate();
    }
  }, [displayedContent, onUpdate]);

  return (
    <div className={`typewriter-content ${isTyping ? "is-typing" : ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayedContent}</ReactMarkdown>
    </div>
  );
});

type ClimbupAIChatbotProps = {
  embedded?: boolean;
  initialContextQuestion?: string;
  initialSubject?: string;
};

export default function ClimbupAIChatbot({ 
  embedded = false,
  initialContextQuestion = "",
  initialSubject = "Academic Discussion"
}: ClimbupAIChatbotProps) {
  const [isOpen, setIsOpen] = useState(embedded);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [contextQuestion, setContextQuestion] = useState(initialContextQuestion);
  const [subject, setSubject] = useState(initialSubject);
  const [theme, setTheme] = useState("dark");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string); 
    };
    reader.readAsDataURL(file);
  };

  // Set initial greeting
  useEffect(() => {
    async function setInitialGreeting() {
      // Only set if we haven't already
      if (messages.length === 0) {
        const { data: { user } } = await supabase.auth.getUser();
        let userName = "";
        
        if (user?.user_metadata?.full_name) {
          // Extract first name
          userName = user.user_metadata.full_name.split(" ")[0] + ", ";
        } else if (user?.user_metadata?.name) {
          userName = user.user_metadata.name.split(" ")[0] + ", ";
        }

        let greetingText = `Hi ${userName}I'm ClimbUP AI! `;
        if (initialContextQuestion) {
          greetingText += `I'm here to help you understand this question step-by-step. Which part is confusing you?`;
        } else {
          greetingText += `I'm here to help. What would you like to explore today?`;
        }

        setMessages([
          {
            role: "assistant",
            content: greetingText,
          },
        ]);
      }
    }
    setInitialGreeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for the custom event to open the chatbot
  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsOpen(true);
      if (customEvent.detail?.question) {
        setContextQuestion(customEvent.detail.question);
      }
      if (customEvent.detail?.subject) {
        setSubject(customEvent.detail.subject);
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

  // Listen for the fill input event
  useEffect(() => {
    const handleFillInput = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.text) {
        setInput(customEvent.detail.text);
      }
    };
    window.addEventListener("climbup-ai-fill-input", handleFillInput);
    return () => window.removeEventListener("climbup-ai-fill-input", handleFillInput);
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Toggle body class for layout shift (now used for shifting popups)
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("chatbot-open");
    } else {
      document.body.classList.remove("chatbot-open");
    }
    return () => {
      document.body.classList.remove("chatbot-open");
    };
  }, [isOpen]);

  const sendMessage = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userText = input.trim() || "[Attached Image]";
    const userMsg: Message = { role: "user", content: userText };
    const updatedMessages = [...messages, userMsg];
    
    // Capture the current image payload and reset local states early
    const imagePayload = selectedImage;
    setMessages(updatedMessages);
    setInput("");
    setSelectedImage(null);
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
          subject: subject,
          context: contextQuestion,
          messages: payloadMessages,
          image_url: imagePayload,
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
    <div className={`chatbot-wrapper ${theme === "light" ? "theme-light" : "theme-dark"} ${embedded ? "chatbot-embedded" : ""}`}>
      <div className={`chatbot-drawer ${isOpen || embedded ? "is-open" : ""}`}>
        <div className="chatbot-header">
          <div className="chatbot-header-title">
            <h2>Climbup AI</h2>
            <span>Beta</span>
          </div>
          {!embedded && (
            <button className="chatbot-close-btn" onClick={() => setIsOpen(false)} aria-label="Close Chat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        <div className="chatbot-messages">
          {messages.map((msg, idx) => {
            const isLastAi = msg.role === "assistant" && idx === messages.length - 1;
            return (
              <div key={idx} className={`chatbot-message-wrapper ${msg.role}`}>
                <div className="chatbot-message-role">{msg.role === "assistant" ? "Climbup AI" : "You"}</div>
                <div className={`chatbot-message ${msg.role}`}>
                  {msg.role === "assistant" ? (
                    <TypewriterMessage content={msg.content} animate={isLastAi} onUpdate={scrollToBottom} />
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            );
          })}
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

        <div className="chatbot-input-area" style={{ flexDirection: 'column', gap: '8px', padding: '12px' }}>
          {selectedImage && (
            <div style={{ position: 'relative', alignSelf: 'flex-start', marginBottom: '4px' }}>
              <img src={selectedImage} alt="preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              <button 
                onClick={() => setSelectedImage(null)}
                style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', fontSize: '12px', padding: 0 }}
              >
                ×
              </button>
            </div>
          )}
          <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '8px' }}>
            <input 
              type="file" 
              accept="image/*" 
              id="chat-image-upload" 
              style={{ display: 'none' }}
              onChange={handleImageSelect} 
              disabled={isLoading}
            />
            <label htmlFor="chat-image-upload" style={{ cursor: 'pointer', padding: '8px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </label>
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
              style={{ flex: 1, margin: 0 }}
            />
            <button 
              className="chatbot-send-btn" 
              onClick={sendMessage} 
              disabled={isLoading || (!input.trim() && !selectedImage)}
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
    </div>
  );
}
