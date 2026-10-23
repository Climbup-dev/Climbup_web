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
  VolumeX,
  Code2,
  AlertTriangle,
  Layers,
  HelpCircle
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
    label: 'Core Concept',
    shortDesc: 'Intuitive concept analogy & summary',
    query: 'Explain the main concept of this lecture in simple words with an intuitive analogy.'
  },
  {
    icon: Code2,
    label: 'Code / Implementation',
    shortDesc: 'Step-by-step code walkthrough',
    query: 'Show me the step-by-step code or implementation demonstrated in this lecture.'
  },
  {
    icon: Clock,
    label: 'Key Timestamps',
    shortDesc: 'Jump to key moments & chapters',
    query: 'What are the most important video timestamps and what is covered at each point?'
  },
  {
    icon: Lightbulb,
    label: 'Practical Pro Tip',
    shortDesc: 'Interview tips & key takeaways',
    query: 'What is the most crucial practical takeaway and interview tip from this class?'
  }
];

const CONTEXTUAL_PROMPTS = [
  { label: '💡 Real-world Example', query: 'Can you give a practical, real-world example of this concept?' },
  { label: '📝 3-Bullet Summary', query: 'Please summarize the key takeaways in 3 crisp bullet points.' },
  { label: '💻 Code Walkthrough', query: 'Can you show a step-by-step code example explaining this?' },
  { label: '❓ Quiz Question', query: 'Ask me a quick practice question to test if I understood this topic.' }
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
                <span className="chatBulletIcon">▶</span>
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
              <span style={{ flex: 1, textAlign: 'left' }}>{item.text}</span>
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

    // Heading (supports #, ##, ###, ####, #####)
    if (/^#{1,6}\s+/.test(trimmed)) {
      flushBullets(`line-${lineIdx}`);
      flushSuggestedQuestions(`line-${lineIdx}`);
      const headingText = trimmed.replace(/^#+\s*/, '');
      if (headingText.toLowerCase().includes('suggested')) {
        isUnderSuggestedHeader = true;
      }
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
      flushSuggestedQuestions(`line-${lineIdx}`);
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

    // Numbered Item (e.g. Suggested Questions)
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
        {renderFormattedTokens(line)}
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
                <Lightbulb size={13} style={{ color: '#60a5fa' }} />
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
                        <span className="quickStarterSnippet">{item.shortDesc || item.query}</span>
                      </div>
                      <ArrowRight size={13} className="quickStarterArrow" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Regular Messages Stream */}
        {!isWelcomeOnly && messages.map((msg, idx) => {
          const isStudent = msg.sender === 'student';
          const isLatestAi = !isStudent && idx === messages.length - 1;
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
                          <Check size={11} style={{ color: '#60a5fa' }} />
                          <span>Copied!</span>
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
                      onSelectQuestion={handleSelectQuestion}
                      onCompleteAnimation={handleCompleteAnimation}
                    />

                    {/* Grounding Evidence / Lecture Citations Bar */}
                    {hasEvidence && (
                      <div className="chatEvidenceSection">
                        <div className="chatEvidenceHeader">
                          <BookOpen size={11} style={{ color: '#60a5fa' }} />
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
              <Brain size={18} strokeWidth={2.4} className="thinkingBrainSvg" />
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

      {/* Contextual Fast Follow-up Action Chips (shown when chat is active and ready) */}
      {!loading && !isWelcomeOnly && (
        <div className="chatContextPillsRow">
          <span className="contextPillsLabel">⚡ Quick Follow-up:</span>
          <div className="contextPillsList">
            {CONTEXTUAL_PROMPTS.map((cp, idx) => (
              <button
                key={idx}
                type="button"
                className="contextPillBtn"
                onClick={() => handleSelectQuestion(cp.query)}
                title={cp.query}
              >
                {cp.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
