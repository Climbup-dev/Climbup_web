'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Trash2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLectureRAG } from '@/hooks/useLectureRAG';
import { parseTimestampToSeconds, parseTextWithTimestamps } from '@/utils/ragHelpers';

interface LectureChatbotProps {
  lessonId: string;
  onSeekVideo?: (seconds: number, label?: string) => void;
  sessionId?: string;
}

export const LectureChatbot: React.FC<LectureChatbotProps> = ({ lessonId, onSeekVideo, sessionId }) => {
  const { messages, loading, error, language, setLanguage, askDoubt, clearChat } = useLectureRAG(lessonId, sessionId);
  const [input, setInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    askDoubt(input);
    setInput('');
  };

  const handleTimestampClick = (timeStr: string) => {
    const seconds = parseTimestampToSeconds(timeStr);
    if (onSeekVideo) {
      onSeekVideo(seconds, timeStr);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'rgba(11, 18, 33, 0.95)',
      borderRadius: '14px',
      overflow: 'hidden',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    }}>
      {/* Chat Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(7, 13, 25, 0.85)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, rgba(56, 211, 153, 0.2), rgba(0, 199, 140, 0.1))',
            border: '1px solid rgba(56, 211, 153, 0.35)',
            display: 'grid',
            placeItems: 'center',
            color: '#38d399',
            fontWeight: 800,
            fontSize: '12px',
          }}>
            <Sparkles size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: '13.5px', fontWeight: 700, margin: 0, color: '#f1f5f9' }}>
              Lecture AI Study Mentor
            </h3>
            <p style={{
              margin: '2px 0 0',
              fontSize: '11px',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#34d399',
                boxShadow: '0 0 6px #34d399',
                display: 'inline-block'
              }} />
              Grounded in Spoken Transcripts
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Language Selector: en / hi */}
          <div style={{
            display: 'inline-flex',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '7px',
            padding: '2px',
            fontSize: '11px',
          }}>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              title="Answer in English"
              style={{
                background: language === 'en' ? 'rgba(56, 211, 153, 0.25)' : 'transparent',
                color: language === 'en' ? '#38d399' : '#94a3b8',
                border: 'none',
                borderRadius: '5px',
                padding: '3px 8px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 700,
                transition: 'all 0.15s ease'
              }}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('hi')}
              title="Answer in Hindi / Hinglish"
              style={{
                background: language === 'hi' ? 'rgba(56, 211, 153, 0.25)' : 'transparent',
                color: language === 'hi' ? '#38d399' : '#94a3b8',
                border: 'none',
                borderRadius: '5px',
                padding: '3px 8px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 700,
                transition: 'all 0.15s ease'
              }}
            >
              HI (हिंदी)
            </button>
          </div>

          <button
            type="button"
            onClick={clearChat}
            title="Clear Chat History"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              padding: '5px 9px',
              borderRadius: '7px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s ease',
            }}
          >
            <Trash2 size={12} /> Clear
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div style={{
        flexGrow: 1,
        overflowY: 'auto',
        padding: '16px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {messages.map((msg) => {
          const isStudent = msg.sender === 'student';
          return (
            <div
              key={msg.id}
              style={{
                alignSelf: isStudent ? 'flex-end' : 'flex-start',
                maxWidth: '92%',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              {/* Sender label */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: isStudent ? '#94a3b8' : '#34d399',
                alignSelf: isStudent ? 'flex-end' : 'flex-start',
              }}>
                <span>{isStudent ? 'You' : 'AI Mentor'}</span>
                {msg.timestamp && (
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>• {msg.timestamp}</span>
                )}
              </div>

              {/* Message Bubble */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '13px',
                  background: isStudent
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(5, 150, 105, 0.18))'
                    : 'rgba(15, 23, 42, 0.85)',
                  border: `1px solid ${isStudent ? 'rgba(56, 211, 153, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                  color: '#f8fafc',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                }}
              >
                {parseTextWithTimestamps(msg.text).map((part, i) =>
                  part.type === 'timestamp' ? (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleTimestampClick(part.content)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        margin: '0 4px',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        background: 'rgba(56, 211, 153, 0.18)',
                        border: '1px solid rgba(56, 211, 153, 0.4)',
                        color: '#34d399',
                        fontSize: '11.5px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        cursor: 'pointer',
                        verticalAlign: 'baseline',
                        transition: 'transform 0.12s ease',
                      }}
                      title="Jump to this video moment"
                    >
                      ▶ {part.content}
                    </button>
                  ) : (
                    <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part.content}</span>
                  )
                )}
              </div>

              {/* Retrieved Ground Truth Evidence Badges */}
              {msg.evidence && msg.evidence.length > 0 && (
                <div style={{
                  marginTop: '4px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: 'rgba(8, 14, 26, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '5px' }}>
                    📚 Ground Truth Transcripts Cited:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {msg.evidence.map((ev, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleTimestampClick(ev.timestamp_label.split(' - ')[0])}
                        style={{
                          fontSize: '10.5px',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          background: 'rgba(30, 41, 59, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#cbd5e1',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontFamily: 'monospace',
                        }}
                      >
                        <span style={{ color: '#34d399', fontWeight: 700 }}>
                          {Math.round(ev.similarity_score * 100)}%
                        </span>
                        <span>{ev.timestamp_label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            background: 'rgba(56, 211, 153, 0.1)',
            border: '1px solid rgba(56, 211, 153, 0.25)',
            padding: '9px 14px',
            borderRadius: '10px',
            fontSize: '12px',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Sparkles size={14} className="animate-spin" />
            <span>Searching pgvector transcripts & synthesizing cited answer...</span>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: '10px 12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(7, 13, 25, 0.95)',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '10px',
          padding: '3px 5px 3px 12px',
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask doubt about this lecture..."
            disabled={loading}
            style={{
              flexGrow: 1,
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
              padding: '7px 0',
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              background: input.trim() && !loading
                ? 'linear-gradient(135deg, #38d399, #00c78c)'
                : 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '8px',
              color: input.trim() && !loading ? '#021526' : 'rgba(255, 255, 255, 0.3)',
              width: '32px',
              height: '32px',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'grid',
              placeItems: 'center',
              transition: 'all 160ms ease',
              flexShrink: 0,
            }}
          >
            <Send size={13} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default LectureChatbot;
