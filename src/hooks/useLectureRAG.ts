import { useState, useCallback, useEffect } from 'react';

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

export const createWelcomeMessage = (title?: string): string => {
  const lectureName = title && title.trim() ? `for **"${title.trim()}"**` : 'for this lecture';
  return `Hello! Welcome to your AI Teaching Assistant ${lectureName}.

I am here to help answer any questions you have about the concepts covered in this video. Ask me any doubt, and I will explain it step-by-step with exact video timestamp jump points!`;
};

export function useLectureRAG(
  lessonId: string, 
  sessionId: string = 'student_session_1',
  lessonTitle?: string
) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'ai',
      text: createWelcomeMessage(lessonTitle),
      timestamp: 'Now',
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  // Update initial welcome message when lessonId or lessonTitle changes
  useEffect(() => {
    setMessages([
      {
        id: `welcome-${lessonId || 'default'}`,
        sender: 'ai',
        text: createWelcomeMessage(lessonTitle),
        timestamp: 'Now',
      }
    ]);
  }, [lessonId, lessonTitle]);

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
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: createWelcomeMessage(lessonTitle),
        timestamp: 'Now',
      }
    ]);
  }, [lessonTitle]);

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
