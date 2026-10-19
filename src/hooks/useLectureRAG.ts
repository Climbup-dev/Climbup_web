import { useState, useCallback } from 'react';

const RAG_BASE_URL = 
  process.env.NEXT_PUBLIC_RAG_SERVER_URL || 
  'http://127.0.0.1:8000';

export interface RetrievedEvidence {
  chunk_index: number;
  topic_name: string;
  timestamp_label: string;
  start_seconds: number;
  end_seconds: number;
  similarity_score: number;
}

export interface ChatMessage {
  id: string;
  sender: 'student' | 'ai';
  text: string;
  evidence?: RetrievedEvidence[];
  timestamp?: string;
}

const DEFAULT_WELCOME_MESSAGE = `Hello! Welcome to the teaching assistant desk for **"Learn Python in 1 hour!"**.

I am here to help answer any questions you have about the concepts covered in this lecture. Here is a quick overview of what the professor introduces in the opening segments:

* **Python & IDE Setup:** Downloading the Python interpreter from \`python.org\` (adding Python to PATH) \`▶ 00:00\`, downloading PyCharm Community Edition \`▶ 01:50\`, and creating your first \`.py\` file \`▶ 01:50\`.
* **Basic Output & Syntax:** Running print statements using \`print()\` \`▶ 01:50\`, using quotes for strings \`▶ 03:44\`, and adding comments using the \`#\` symbol \`▶ 03:44\`.
* **Variables & Data Types:** Defining variables as reusable containers \`▶ 03:44\`, using f-strings (\`f"..."\`) to insert variables into text \`▶ 05:38\`, and working with basic data types like **Strings**, **Integers**, and **Floats** \`▶ 03:44\` \`▶ 05:38\`.

How can I assist you with your Python learning today? Feel free to ask a specific question about the lecture!

---

### Suggested Questions
1. How do I install Python and configure PyCharm to create my first project?
2. What is an f-string, and how do I use it to print variables in Python?`;

export function useLectureRAG(lessonId: string, sessionId: string = 'student_session_1') {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: DEFAULT_WELCOME_MESSAGE,
      timestamp: 'Now',
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  const askDoubt = useCallback(async (query: string) => {
    if (!query.trim() || !lessonId) return;

    const studentMsgId = `student-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: studentMsgId,
      sender: 'student',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${RAG_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          query: query,
          language: language,
          lesson_id: lessonId,
          video_id: lessonId,
          session_id: sessionId || 'student_session_1'
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned ${response.status}`);
      }

      const data = await response.json();
      const answerText = 
        data.answer || 
        data.response || 
        data.text || 
        data.message || 
        data.reply || 
        (typeof data === 'string' ? data : 'Answer generated successfully.');

      const evidenceData = 
        data.retrieved_evidence || 
        data.evidence || 
        data.sources || 
        data.citations || 
        [];

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: answerText,
        evidence: evidenceData,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('[RAG Client Error]:', err);
      setError(err.message || 'Failed to retrieve answer.');
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ai',
          text: `⚠️ ${err.message || 'Could not connect to the lecture assistant server. Please ensure the server is online.'}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [lessonId, language, sessionId]);

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: DEFAULT_WELCOME_MESSAGE,
        timestamp: 'Now',
      }
    ]);
  }, []);

  return {
    messages,
    loading,
    error,
    language,
    setLanguage,
    askDoubt,
    clearChat
  };
}
