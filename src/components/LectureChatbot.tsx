'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Send, Trash2, Brain, ArrowRight, Lightbulb } from 'lucide-react';
import { useLectureRAG } from '@/hooks/useLectureRAG';
import { parseTimestampToSeconds, parseInlineFormatted } from '@/utils/ragHelpers';
import '@/styles/LectureChatbot.css';

interface LectureChatbotProps {
  lessonId: string;
  lessonTitle?: string;
  onSeekVideo?: (seconds: number, label?: string) => void;
  sessionId?: string;
}

const THINKING_STEPS = [
  'Analyzing lecture audio & keywords...',
  'Locating precise video timestamps...',
  'Structuring clean, step-by-step explanation...',
];

/**
 * Renders structured markdown text:
 * - ### Headings
 * - --- Horizontal rules
 * - Bullet lists (* or -)
 * - Suggested Question interactive chips (if any)
 * - Inline bold, code, and clickable video timestamp buttons
 */
interface StructuredMessageContentProps {
  text: string;
  onTimestampClick: (ts: string) => void;
  onSelectQuestion: (question: string) => void;
  showCursor?: boolean;
}

const StructuredMessageContent: React.FC<StructuredMessageContentProps> = ({
  text,
  onTimestampClick,
  onSelectQuestion,
  showCursor,
}) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  let currentBulletGroup: string[] = [];
  let currentSuggestedQuestions: { num: string; text: string }[] = [];
  let isUnderSuggestedHeader = false;

  const flushBullets = (keyPrefix: string) => {
    if (currentBulletGroup.length > 0) {
      const bulletsToRender = [...currentBulletGroup];
      currentBulletGroup = [];
      elements.push(
        <ul key={`${keyPrefix}-bullets`} className="chatBulletList">
          {bulletsToRender.map((bText, bIdx) => (
            <li key={bIdx} className="chatBulletItem">
              <span className="chatBulletIcon">▶</span>
              <span>
                {parseInlineFormatted(bText).map((part, pIdx) => {
                  if (part.type === 'bold') {
                    return <strong key={pIdx} className="chatBold">{part.value}</strong>;
                  }
                  if (part.type === 'code') {
                    return <code key={pIdx} className="chatCode">{part.value}</code>;
                  }
                  if (part.type === 'timestamp') {
                    return (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => onTimestampClick(part.value)}
                        className="chatTimestampBtn"
                        title={`Jump to video at ${part.value}`}
                      >
                        ▶ {part.value}
                      </button>
                    );
                  }
                  return <span key={pIdx}>{part.value}</span>;
                })}
              </span>
            </li>
          ))}
        </ul>
      );
    }
  };

  const flushSuggestedQuestions = (keyPrefix: string) => {
    if (currentSuggestedQuestions.length > 0) {
      const questionsToRender = [...currentSuggestedQuestions];
      currentSuggestedQuestions = [];
      elements.push(
        <div key={`${keyPrefix}-suggested`} className="suggestedQuestionsContainer">
          {questionsToRender.map((item, qIdx) => (
            <button
              key={qIdx}
              type="button"
              className="suggestedQuestionBtn"
              onClick={() => onSelectQuestion(item.text)}
              title="Click to ask this question"
            >
              <span className="questionNumBadge">{item.num}</span>
              <span style={{ flex: 1 }}>{item.text}</span>
              <ArrowRight size={13} className="questionArrowIcon" />
            </button>
          ))}
        </div>
      );
    }
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '___') {
      flushBullets(`line-${lineIdx}`);
      flushSuggestedQuestions(`line-${lineIdx}`);
      elements.push(<hr key={`hr-${lineIdx}`} className="chatDivider" />);
      return;
    }

    // Heading (e.g. ### Suggested Questions)
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
      flushBullets(`line-${lineIdx}`);
      flushSuggestedQuestions(`line-${lineIdx}`);
      const headingText = trimmed.replace(/^#+\s*/, '');
      if (headingText.toLowerCase().includes('suggested')) {
        isUnderSuggestedHeader = true;
      }
      elements.push(
        <h4 key={`heading-${lineIdx}`} className="chatHeading">
          <Lightbulb size={13} style={{ color: '#34d399' }} />
          <span>{headingText}</span>
        </h4>
      );
      return;
    }

    // Numbered Item (e.g. 1. How do I install Python...)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch && (isUnderSuggestedHeader || numMatch[2].includes('?'))) {
      flushBullets(`line-${lineIdx}`);
      currentSuggestedQuestions.push({ num: numMatch[1], text: numMatch[2] });
      return;
    }

    // Bullet Item (* or -)
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      currentBulletGroup.push(trimmed.slice(2));
      return;
    }

    // If regular line, flush accumulated bullets and questions first
    flushBullets(`line-${lineIdx}`);
    flushSuggestedQuestions(`line-${lineIdx}`);

    if (trimmed === '') {
      return;
    }

    // Regular Paragraph
    elements.push(
      <p key={`p-${lineIdx}`} className="chatParagraph">
        {parseInlineFormatted(line).map((part, pIdx) => {
          if (part.type === 'bold') {
            return <strong key={pIdx} className="chatBold">{part.value}</strong>;
          }
          if (part.type === 'code') {
            return <code key={pIdx} className="chatCode">{part.value}</code>;
          }
          if (part.type === 'timestamp') {
            return (
              <button
                key={pIdx}
                type="button"
                onClick={() => onTimestampClick(part.value)}
                className="chatTimestampBtn"
                title={`Jump to video at ${part.value}`}
              >
                ▶ {part.value}
              </button>
            );
          }
          return <span key={pIdx}>{part.value}</span>;
        })}
      </p>
    );
  });

  flushBullets('final');
  flushSuggestedQuestions('final');

  return (
    <>
      {elements}
      {showCursor && <span className="typewriterCursor" aria-hidden="true" />}
    </>
  );
};

/**
 * Typewriter message component:
 * Types out the text letter by letter if newly received from AI
 */
interface TypewriterMessageProps {
  messageId: string;
  text: string;
  isAi: boolean;
  shouldAnimate: boolean;
  onTimestampClick: (ts: string) => void;
  onSelectQuestion: (q: string) => void;
  onCompleteAnimation: (id: string) => void;
}

const TypewriterMessage: React.FC<TypewriterMessageProps> = ({
  messageId,
  text,
  isAi,
  shouldAnimate,
  onTimestampClick,
  onSelectQuestion,
  onCompleteAnimation,
}) => {
  const [displayedLength, setDisplayedLength] = useState<number>(() => {
    return shouldAnimate ? 0 : text.length;
  });

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplayedLength(text.length);
      return;
    }

    let current = 0;
    const totalLength = text.length;
    const interval = setInterval(() => {
      current += 2;
      if (current >= totalLength) {
        current = totalLength;
        setDisplayedLength(totalLength);
        clearInterval(interval);
        onCompleteAnimation(messageId);
      } else {
        setDisplayedLength(current);
      }
    }, 12);

    return () => clearInterval(interval);
  }, [messageId, shouldAnimate, text, onCompleteAnimation]);

  const isTyping = shouldAnimate && displayedLength < text.length;
  const currentText = text.slice(0, displayedLength);

  return (
    <div
      onClick={() => {
        if (isTyping) {
          setDisplayedLength(text.length);
          onCompleteAnimation(messageId);
        }
      }}
      title={isTyping ? 'Click to show all' : undefined}
      style={{ cursor: isTyping ? 'pointer' : 'default' }}
    >
      <StructuredMessageContent
        text={currentText}
        onTimestampClick={onTimestampClick}
        onSelectQuestion={onSelectQuestion}
        showCursor={isTyping}
      />
    </div>
  );
};

export const LectureChatbot: React.FC<LectureChatbotProps> = ({ 
  lessonId, 
  lessonTitle, 
  onSeekVideo, 
  sessionId 
}) => {
  const { messages, loading, language, setLanguage, askDoubt, clearChat } = useLectureRAG(
    lessonId, 
    sessionId, 
    lessonTitle
  );
  const [input, setInput] = useState('');
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const animatedSetRef = useRef<Set<string>>(new Set(['welcome']));
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Dynamic thinking status cycling every 1.5s
  useEffect(() => {
    if (!loading) {
      setThinkingIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setThinkingIndex((prev) => (prev + 1) % THINKING_STEPS.length);
    }, 1500);
    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    askDoubt(input.trim());
    setInput('');
  };

  const handleSelectQuestion = (question: string) => {
    if (loading) return;
    askDoubt(question);
  };

  const handleTimestampClick = useCallback((timeStr: string) => {
    const seconds = parseTimestampToSeconds(timeStr);
    if (onSeekVideo) {
      onSeekVideo(seconds, timeStr);
    }
  }, [onSeekVideo]);

  const handleCompleteAnimation = useCallback((id: string) => {
    animatedSetRef.current.add(id);
  }, []);

  return (
    <div className="chatbotContainer">
      {/* Chat Header */}
      <div className="chatHeader">
        <div className="chatHeaderLeft">
          <div className="chatAvatarIcon">
            <Sparkles size={17} />
          </div>
          <div>
            <h3 className="chatTitle">ClimbUP AI Mentor</h3>
            <p className="chatSubtitle">
              <span className="chatStatusDot" />
              Grounded in Video Transcripts
            </p>
          </div>
        </div>

        <div className="chatHeaderRight">
          {/* Language Selector: en / hi */}
          <div className="langSwitch">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`langBtn ${language === 'en' ? 'active' : ''}`}
              title="Answer in English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('hi')}
              className={`langBtn ${language === 'hi' ? 'active' : ''}`}
              title="Answer in Hindi / Hinglish"
            >
              HI (हिन्दी)
            </button>
          </div>

          <button
            type="button"
            onClick={clearChat}
            title="Reset Chat History"
            className="clearChatBtn"
          >
            <Trash2 size={12} /> Clear
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="chatMessagesScroll">
        {messages.map((msg, idx) => {
          const isStudent = msg.sender === 'student';
          const isLatestAi = !isStudent && idx === messages.length - 1;
          const shouldAnimate = isLatestAi && !animatedSetRef.current.has(msg.id);

          return (
            <div
              key={msg.id}
              className={`messageWrapper ${isStudent ? 'student' : 'ai'}`}
            >
              {/* Sender label */}
              <div className="senderMeta">
                <span>{isStudent ? 'You' : 'AI Mentor'}</span>
                {msg.timestamp && <span className="senderTime">⏱ {msg.timestamp}</span>}
              </div>

              {/* Message Bubble */}
              <div className={`chatBubble ${isStudent ? 'student' : 'ai'}`}>
                {isStudent ? (
                  <p className="chatParagraph">{msg.text}</p>
                ) : (
                  <TypewriterMessage
                    messageId={msg.id}
                    text={msg.text}
                    isAi={true}
                    shouldAnimate={shouldAnimate}
                    onTimestampClick={handleTimestampClick}
                    onSelectQuestion={handleSelectQuestion}
                    onCompleteAnimation={handleCompleteAnimation}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Thinking & Reasoning Animation Box */}
        {loading && (
          <div className="thinkingCard" role="status" aria-live="polite">
            <div className="thinkingHeader">
              <div className="thinkingBrainIconWrapper">
                <div className="thinkingPulseRing" />
                <div className="thinkingPulseGlow" />
                <Brain size={20} strokeWidth={2.4} className="thinkingBrainSvg" />
              </div>
              <div className="thinkingTitleContainer">
                <div className="thinkingTitleRow">
                  <span className="thinkingLabel">AI Thinking</span>
                  <span className="thinkingDots" aria-hidden="true">
                    <span className="thinkingDot" />
                    <span className="thinkingDot" />
                    <span className="thinkingDot" />
                  </span>
                </div>
                <p className="thinkingStepText">
                  {THINKING_STEPS[thinkingIndex]}
                </p>
              </div>
            </div>

            <div className="thinkingShimmerBar" aria-hidden="true">
              <div className="thinkingShimmerBeam" />
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="chatInputForm">
        <div className="chatInputContainer">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask doubt about this lecture..."
            disabled={loading}
            className="chatInputField"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={`chatSendBtn ${input.trim() && !loading ? 'active' : 'disabled'}`}
            title="Send query"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default LectureChatbot;
