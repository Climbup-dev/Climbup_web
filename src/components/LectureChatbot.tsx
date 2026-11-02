'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Send, 
  Trash2, 
  Brain, 
  Copy, 
  Check, 
  BookOpen,
  Volume2,
  VolumeX,
  Code2,
  AlertTriangle
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

/**
 * Syntax-styled code block with language badge and one-click copy button
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
          <Code2 size={13} style={{ color: '#60a5fa' }} />
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
              <Check size={12} style={{ color: '#60a5fa' }} />
              <span style={{ color: '#60a5fa' }}>Copied!</span>
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
  showCursor?: boolean;
}

const StructuredMessageContent: React.FC<StructuredMessageContentProps> = ({
  text,
  onTimestampClick,
  showCursor,
}) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  let currentBulletGroup: string[] = [];

  const renderFormattedTokens = (rawText: string) => {
    return parseInlineFormatted(rawText).map((part, pIdx) => {
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
    });
  };

  const flushBullets = (keyPrefix: string) => {
    if (currentBulletGroup.length > 0) {
      const bulletsToRender = [...currentBulletGroup];
      currentBulletGroup = [];
      elements.push(
        <div key={`${keyPrefix}-bullets-wrapper`} className="chatBulletsWrapper">
          {bulletsToRender.map((bText, bIdx) => {
            const isProTip = bText.includes('Pro Tip') || bText.includes('Key Insight') || bText.startsWith('💡');
            const isCaution = bText.includes('Pitfall') || bText.includes('Warning') || bText.includes('Caution') || bText.startsWith('⚠️');
            const isMechanism = bText.includes('Mechanism') || bText.includes('How it works') || bText.startsWith('⚙️');

            if (isProTip) {
              return (
                <div key={bIdx} className="chatProTipCard">
                  <div className="chatProTipIcon">💡</div>
                  <div className="chatProTipBody">
                    {renderFormattedTokens(bText.replace(/^💡\s*/, ''))}
                  </div>
                </div>
              );
            }

            if (isCaution) {
              return (
                <div key={bIdx} className="chatCautionCard">
                  <div className="chatCautionIcon">⚠️</div>
                  <div className="chatCautionBody">
                    {renderFormattedTokens(bText.replace(/^⚠️\s*/, ''))}
                  </div>
                </div>
              );
            }

            if (isMechanism) {
              return (
                <div key={bIdx} className="chatMechanismCard">
                  <div className="chatMechanismIcon">⚙️</div>
                  <div className="chatMechanismBody">
                    {renderFormattedTokens(bText.replace(/^⚙️\s*/, ''))}
                  </div>
                </div>
              );
            }

            return (
              <div key={bIdx} className="chatBulletItem">
                <span className="chatBulletDot">•</span>
                <span className="chatBulletText">
                  {renderFormattedTokens(bText)}
                </span>
              </div>
            );
          })}
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
        flushBullets(`line-${lineIdx}`);
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
      elements.push(<hr key={`hr-${lineIdx}`} className="chatDivider" />);
      return;
    }

    // Heading (supports #, ##, ###, ####, #####)
    if (/^#{1,6}\s+/.test(trimmed)) {
      flushBullets(`line-${lineIdx}`);
      const headingText = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <h4 key={`heading-${lineIdx}`} className="chatHeading">
          <Sparkles size={14} style={{ color: '#2563eb' }} />
          <span>{headingText}</span>
        </h4>
      );
      return;
    }

    // Caution / Curriculum Notice (starts with ⚠️ or Topic Not Discussed)
    if (trimmed.startsWith('⚠️') || trimmed.includes('Topic Not Discussed')) {
      flushBullets(`line-${lineIdx}`);
      elements.push(
        <div key={`caution-${lineIdx}`} className="chatCautionCard">
          <div className="chatCautionHeader">
            <AlertTriangle size={15} color="#d97706" />
            <span className="chatCautionBadge">Curriculum Scope Notice</span>
          </div>
          <div className="chatCautionBody">
            {renderFormattedTokens(trimmed.replace(/^⚠️\s*/, ''))}
          </div>
        </div>
      );
      return;
    }

    // Numbered List Item
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      flushBullets(`line-${lineIdx}`);
      elements.push(
        <div key={`num-${lineIdx}`} className="chatNumberedItem">
          <span className="chatNumberPrefix">{numMatch[1]}.</span>
          <div className="chatNumberText">
            {renderFormattedTokens(numMatch[2])}
          </div>
        </div>
      );
      return;
    }

    // Bullet Item (* or -)
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      currentBulletGroup.push(trimmed.slice(2));
      return;
    }

    // Regular line
    flushBullets(`line-${lineIdx}`);

    if (trimmed === '') {
      return;
    }

    // Regular Paragraph
    elements.push(
      <p key={`p-${lineIdx}`} className="chatParagraph">
        {renderFormattedTokens(line)}
      </p>
    );
  });

  flushBullets('final');

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
  onCompleteAnimation: (id: string) => void;
}

const TypewriterMessage: React.FC<TypewriterMessageProps> = ({
  messageId,
  text,
  shouldAnimate,
  onTimestampClick,
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
      current += 8;
      if (current >= totalLength) {
        current = totalLength;
        setDisplayedLength(totalLength);
        clearInterval(interval);
        onCompleteAnimation(messageId);
      } else {
        setDisplayedLength(current);
      }
    }, 10);

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
      title={isTyping ? 'Click to reveal entire response immediately' : undefined}
      style={{ cursor: isTyping ? 'pointer' : 'default' }}
    >
      <StructuredMessageContent
        text={currentText}
        onTimestampClick={onTimestampClick}
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
  const [speakingId, setSpeakingId] = useState<string | null>(null);
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
    const scrollToBottom = () => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };
    scrollToBottom();
    const timerA = setTimeout(scrollToBottom, 60);
    const timerB = setTimeout(scrollToBottom, 200);
    return () => {
      clearTimeout(timerA);
      clearTimeout(timerB);
    };
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    askDoubt(input.trim());
    setInput('');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleToggleSpeak = (id: string, text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean text: strip markdown code blocks and symbols for clean spoken audio
    const cleanSpeech = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted for reading.')
      .replace(/[*#`_\[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
    utterance.rate = 1.0;

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  // Stop speech if component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleTimestampClick = useCallback((timeStr: string) => {
    const seconds = parseTimestampToSeconds(timeStr);
    if (onSeekVideo) {
      onSeekVideo(seconds, timeStr);
    }
  }, [onSeekVideo]);

  const handleCompleteAnimation = useCallback((id: string) => {
    animatedSetRef.current.add(id);
  }, []);

  const isWelcomeOnly = messages.length === 0 || (messages.length === 1 && messages[0].id.startsWith('welcome'));
  const chatMessages = messages.filter((m) => !m.id.startsWith('welcome'));

  return (
    <div className="chatbotContainer">
      {/* Clean Chat Header */}
      <div className="chatHeader">
        <div className="chatHeaderLeft">
          <div className="chatAvatarIcon">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="chatHeaderTitleRow">
              <h3 className="chatTitle">PractQ AI Mentor</h3>
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
            <Trash2 size={13} /> <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="chatMessagesScroll">
        {/* Clean, Modern Empty State (No default questions) */}
        {isWelcomeOnly && (
          <div className="chatEmptyState">
            <div className="chatEmptyIconWrapper">
              <Sparkles size={26} className="chatEmptySparkle" />
            </div>
            <h3 className="chatEmptyTitle">How can I help you today?</h3>
            <p className="chatEmptySubtitle">
              Ask any doubts about concepts, formulas, or code demonstrated in this lecture. 
              Explanations include clickable video timestamps to jump directly to key moments.
            </p>
            {lessonTitle && (
              <div className="chatEmptyLessonTag" title={lessonTitle}>
                <BookOpen size={13} className="chatEmptyLessonIcon" />
                <span className="chatEmptyLessonPrefix">Current Lecture:</span>
                <span className="chatEmptyLessonName">
                  {lessonTitle.length > 40 ? `${lessonTitle.slice(0, 38)}...` : lessonTitle}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Regular Messages Stream */}
        {!isWelcomeOnly && chatMessages.map((msg, idx) => {
          const isStudent = msg.sender === 'student';
          const isLatestAi = !isStudent && idx === chatMessages.length - 1;
          const shouldAnimate = isLatestAi && !animatedSetRef.current.has(msg.id);
          const hasEvidence = !isStudent && Array.isArray(msg.evidence) && msg.evidence.length > 0;

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
                  <div className="aiActionsRow">
                    {/* Read Aloud Text-to-Speech */}
                    <button
                      type="button"
                      onClick={() => handleToggleSpeak(msg.id, msg.text)}
                      className={`speakMsgBtn ${speakingId === msg.id ? 'active' : ''}`}
                      title={speakingId === msg.id ? 'Stop audio' : 'Read explanation aloud'}
                    >
                      {speakingId === msg.id ? <VolumeX size={11} /> : <Volume2 size={11} />}
                      <span>{speakingId === msg.id ? 'Stop' : 'Listen'}</span>
                    </button>

                    {/* Copy Button */}
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="copyMsgBtn"
                      title="Copy AI explanation"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={11} style={{ color: '#2563eb' }} />
                          <span style={{ color: '#2563eb' }}>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Message Bubble */}
              <div className={`chatBubble ${isStudent ? 'student' : 'ai'}`}>
                {isStudent ? (
                  <p className="chatParagraph">{msg.text}</p>
                ) : (
                  <>
                    <TypewriterMessage
                      messageId={msg.id}
                      text={msg.text}
                      isAi={true}
                      shouldAnimate={shouldAnimate}
                      onTimestampClick={handleTimestampClick}
                      onCompleteAnimation={handleCompleteAnimation}
                    />

                    {/* Grounding Evidence / Lecture Citations Bar */}
                    {hasEvidence && (
                      <div className="chatEvidenceSection">
                        <div className="chatEvidenceHeader">
                          <BookOpen size={11} style={{ color: '#2563eb' }} />
                          <span>Video Grounding Citations:</span>
                        </div>
                        <div className="chatEvidenceChipsGrid">
                          {msg.evidence!.map((ev, eIdx) => {
                            const rawTime = ev.timestamp_label || '';
                            const firstTime = rawTime.split(' ')[0] || '00:00';
                            const matchPercent = Math.min(99, Math.round((ev.similarity_score || 0.85) * 100));

                            return (
                              <button
                                key={eIdx}
                                type="button"
                                onClick={() => handleTimestampClick(firstTime)}
                                className="chatEvidenceChip"
                                title={`Jump video to ${rawTime} (${ev.topic_name || 'Lecture segment'})`}
                              >
                                <span className="evidencePlayTriangle">▶</span>
                                <span className="evidenceTime">{rawTime}</span>
                                {ev.topic_name && (
                                  <span className="evidenceTopicPill">{ev.topic_name}</span>
                                )}
                                <span className="evidenceScoreBadge">{matchPercent}% match</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Sleek Modern AI Thinking Pill */}
        {loading && (
          <div className="thinkingCard" role="status" aria-live="polite">
            <div className="thinkingBrainIconWrapper">
              <Brain size={16} strokeWidth={2.4} className="thinkingBrainSvg" />
            </div>
            <div className="thinkingTitleContainer">
              <span className="thinkingLabel">AI Reasoning</span>
              <span className="thinkingStepDivider">•</span>
              <span className="thinkingStepText">{THINKING_STEPS[thinkingIndex]}</span>
            </div>
            <div className="thinkingDots" aria-hidden="true">
              <span className="thinkingDot" />
              <span className="thinkingDot" />
              <span className="thinkingDot" />
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Clean Professional Input Form */}
      <form onSubmit={handleSubmit} className="chatInputForm">
        <div className="chatInputContainer">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about this lecture..."
            disabled={loading}
            className="chatInputField"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={`chatSendBtn ${input.trim() && !loading ? 'active' : 'disabled'}`}
            title="Send question"
            aria-label="Send question"
          >
            <Send size={15} />
          </button>
        </div>
        <div className="chatInputHintRow">
          <span>Press Enter to send • Click timestamps to jump video</span>
        </div>
      </form>
    </div>
  );
};

export default LectureChatbot;
