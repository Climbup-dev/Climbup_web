'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Send, 
  Trash2, 
  Brain, 
  ArrowRight, 
  Lightbulb, 
  Copy, 
  Check, 
  Zap, 
  Clock, 
  BookOpen,
  Volume2,
  Code2
} from 'lucide-react';
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
  'Scanning lecture audio & speech transcript...',
  'Pinpointing precise video timestamps...',
  'Structuring clear, step-by-step explanation...',
];

const QUICK_STARTERS = [
  {
    icon: Zap,
    label: 'Key Concepts',
    query: 'Summarize the core topics and concepts taught in this video lecture.'
  },
  {
    icon: Clock,
    label: 'Timestamps & Chapters',
    query: 'What are the main sections and important timestamps in this lecture?'
  },
  {
    icon: Lightbulb,
    label: 'Main Takeaway',
    query: 'Explain the most important takeaway of this lecture in simple words.'
  },
  {
    icon: BookOpen,
    label: 'Study Notes',
    query: 'What are the most crucial points I should write down in my study notes from this lecture?'
  }
];

/**
 * Renders structured markdown text:
 * - ### Headings
 * - --- Horizontal rules
 * - Bullet lists (* or -)
 * - Suggested Question interactive chips (if any)
 * - Inline bold, code, and clickable video timestamp buttons
 */

/**
 * Renders a syntax-styled code block with language badge and one-click copy button
 */
const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="chatCodeBlockContainer">
      <div className="chatCodeBlockHeader">
        <div className="chatCodeBlockLangBadge">
          <Code2 size={13} style={{ color: '#34d399' }} />
          <span>{language.toUpperCase() || 'CODE'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopyCode}
          className="chatCodeCopyBtn"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check size={12} style={{ color: '#34d399' }} />
              <span style={{ color: '#34d399' }}>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>
      <pre className="chatCodeBlockPre">
        <code className="chatCodeBlockContent">{code}</code>
      </pre>
    </div>
  );
};

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
                        title={`Jump video to ${part.value}`}
                      >
                        <span className="tsPlayTriangle">▶</span> {part.value}
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

  let inCodeBlock = false;
  let codeBlockLang = '';
  let currentCodeLines: string[] = [];

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    // Fenced Code Block (```lang ... ```)
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // Closing code block
        const codeText = currentCodeLines.join('\n');
        elements.push(
          <CodeBlock
            key={`code-block-${lineIdx}`}
            code={codeText}
            language={codeBlockLang}
          />
        );
        currentCodeLines = [];
        codeBlockLang = '';
        inCodeBlock = false;
      } else {
        // Opening code block
        flushBullets(`line-${lineIdx}`);
        flushSuggestedQuestions(`line-${lineIdx}`);
        codeBlockLang = trimmed.replace(/^```/, '').trim() || 'code';
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      currentCodeLines.push(line);
      return;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '___') {
      flushBullets(`line-${lineIdx}`);
      flushSuggestedQuestions(`line-${lineIdx}`);
      elements.push(<hr key={`hr-${lineIdx}`} className="chatDivider" />);
      return;
    }

    // Heading (e.g. ### Suggested Questions or Notes)
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
      flushBullets(`line-${lineIdx}`);
      flushSuggestedQuestions(`line-${lineIdx}`);
      const headingText = trimmed.replace(/^#+\s*/, '');
      if (headingText.toLowerCase().includes('suggested')) {
        isUnderSuggestedHeader = true;
      }
      elements.push(
        <h4 key={`heading-${lineIdx}`} className="chatHeading">
          <Lightbulb size={14} style={{ color: '#34d399' }} />
          <span>{headingText}</span>
        </h4>
      );
      return;
    }

    // Numbered Item
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

    // Regular line
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
                title={`Jump video to ${part.value}`}
              >
                <span className="tsPlayTriangle">▶</span> {part.value}
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

  if (inCodeBlock && currentCodeLines.length > 0) {
    elements.push(
      <CodeBlock
        key="code-block-unclosed"
        code={currentCodeLines.join('\n')}
        language={codeBlockLang}
      />
    );
  }

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
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

  const isWelcomeOnly = messages.length === 1 && messages[0].id.startsWith('welcome');

  return (
    <div className="chatbotContainer">
      {/* Chat Header */}
      <div className="chatHeader">
        <div className="chatHeaderLeft">
          <div className="chatAvatarIcon">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="chatHeaderTitleRow">
              <h3 className="chatTitle">ClimbUP AI Mentor</h3>
              <span className="chatOnlineBadge">Live</span>
            </div>
            <p className="chatSubtitle">
              <span className="chatStatusDot" />
              {lessonTitle ? (
                <span className="chatLessonPill" title={lessonTitle}>
                  {lessonTitle.length > 28 ? `${lessonTitle.slice(0, 26)}...` : lessonTitle}
                </span>
              ) : (
                'Grounded in Video Transcripts'
              )}
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
        {/* Rich Welcome Hero Card when chat is in initial state */}
        {isWelcomeOnly && (
          <div className="welcomeHeroCard">
            <div className="welcomeBadgeRow">
              <span className="welcomeAssistantPill">
                <Sparkles size={13} />
                <span>AI Teaching Assistant Desk</span>
              </span>
              <span className="welcomeActiveDot">
                <span className="welcomeLivePulse" />
                Ready
              </span>
            </div>

            <h2 className="welcomeHeroTitle">
              Welcome to your Lecture Mentor!
            </h2>

            {lessonTitle && (
              <div className="welcomeLessonBanner">
                <BookOpen size={14} className="welcomeLessonIcon" />
                <span className="welcomeLessonPrefix">Lecture:</span>
                <strong className="welcomeLessonName">{lessonTitle}</strong>
              </div>
            )}

            <p className="welcomeHeroDesc">
              Ask any doubts about concepts, explanations, or code shown in this video. 
              Every answer gives you concise explanations with <strong>clickable video jump links</strong>!
            </p>

            <div className="welcomeFeaturesRow">
              <span className="welcomeFeatureTag">🎯 100% Transcript Grounded</span>
              <span className="welcomeFeatureTag">⏱️ Interactive Video Jump Points</span>
              <span className="welcomeFeatureTag">🌐 English & Hinglish</span>
            </div>

            {/* Quick Starter Action Chips */}
            <div className="quickStartersSection">
              <div className="quickStartersHeader">
                <Lightbulb size={13} style={{ color: '#34d399' }} />
                <span>Quick Prompt Starters</span>
              </div>
              <div className="quickStartersGrid">
                {QUICK_STARTERS.map((item, sIdx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={sIdx}
                      type="button"
                      className="quickStarterBtn"
                      onClick={() => handleSelectQuestion(item.query)}
                      disabled={loading}
                      title={`Click to ask: "${item.query}"`}
                    >
                      <div className="quickStarterIconBox">
                        <Icon size={14} />
                      </div>
                      <div className="quickStarterTextBox">
                        <span className="quickStarterLabel">{item.label}</span>
                        <span className="quickStarterSnippet">{item.query}</span>
                      </div>
                      <ArrowRight size={13} className="quickStarterArrow" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Regular Messages Stream (Shown after initial interaction, or normal messages) */}
        {!isWelcomeOnly && messages.map((msg, idx) => {
          const isStudent = msg.sender === 'student';
          const isLatestAi = !isStudent && idx === messages.length - 1;
          const shouldAnimate = isLatestAi && !animatedSetRef.current.has(msg.id);

          return (
            <div
              key={msg.id}
              className={`messageWrapper ${isStudent ? 'student' : 'ai'}`}
            >
              {/* Sender label & Actions */}
              <div className="senderMeta">
                <span className="senderLabel">{isStudent ? 'You' : 'AI Mentor'}</span>
                {msg.timestamp && <span className="senderTime">⏱ {msg.timestamp}</span>}
                {!isStudent && (
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="copyMsgBtn"
                    title="Copy AI explanation"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check size={11} style={{ color: '#34d399' }} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
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

        {/* High-Tech Thinking & Reasoning Hologram Box */}
        {loading && (
          <div className="thinkingCard" role="status" aria-live="polite">
            <div className="thinkingHeader">
              {/* Vibrant Glowing Brain Icon Wrapper */}
              <div className="thinkingBrainIconWrapper">
                <div className="thinkingPulseRing1" />
                <div className="thinkingPulseRing2" />
                <div className="thinkingPulseGlow" />
                <Brain size={22} strokeWidth={2.4} className="thinkingBrainSvg" />
              </div>

              {/* Status and Audio Equalizer Visualizer */}
              <div className="thinkingTitleContainer">
                <div className="thinkingTitleRow">
                  <span className="thinkingLabel">AI Reasoning & Retrieval</span>
                  
                  {/* Animated Audio Equalizer Bars showing live transcript scan */}
                  <div className="audioEqualizerBars" title="Scanning audio transcript">
                    <span className="audioBar bar1" />
                    <span className="audioBar bar2" />
                    <span className="audioBar bar3" />
                    <span className="audioBar bar4" />
                    <span className="audioBar bar5" />
                  </div>

                  <span className="thinkingDots" aria-hidden="true">
                    <span className="thinkingDot" />
                    <span className="thinkingDot" />
                    <span className="thinkingDot" />
                  </span>
                </div>

                {/* Dynamic Step Text */}
                <p className="thinkingStepText">
                  {THINKING_STEPS[thinkingIndex]}
                </p>
              </div>
            </div>

            {/* Glowing Shimmer Laser Beam */}
            <div className="thinkingShimmerBar" aria-hidden="true">
              <div className="thinkingShimmerBeam" />
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Form with Floating Styling */}
      <form onSubmit={handleSubmit} className="chatInputForm">
        <div className="chatInputContainer">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask doubt about this lecture (e.g. explain formula at 03:45)..."
            disabled={loading}
            className="chatInputField"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={`chatSendBtn ${input.trim() && !loading ? 'active' : 'disabled'}`}
            title="Send query"
          >
            <Send size={15} />
          </button>
        </div>
        <div className="chatInputHintRow">
          <span>💡 Press Enter to ask • Click any video timestamp to jump player</span>
        </div>
      </form>
    </div>
  );
};

export default LectureChatbot;
