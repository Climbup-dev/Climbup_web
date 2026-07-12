import React, { useState, useEffect } from "react";

type ImprovedAnswerCard = {
  id: string;
  source: "ai" | "student";
  badge: "DRAFT" | "PUBLISHED" | "AI";
  preview: string;
  href: string;
  authorName: string;
  authorImage: string;
  authorInitials: string;
};

type CommunityAnswersPopupProps = {
  questionId: string;
  currentAnswerId: string;
  closing: boolean;
  onClose: () => void;
  AnswerAvatar: React.ComponentType<{ image: string; initials: string }>;
};

export default function CommunityAnswersPopup({
  questionId,
  currentAnswerId,
  closing,
  onClose,
  AnswerAvatar,
}: CommunityAnswersPopupProps) {
  const [answerCards, setAnswerCards] = useState<ImprovedAnswerCard[]>([]);
  const [isLoadingImproved, setIsLoadingImproved] = useState(true);
  const [improvedError, setImprovedError] = useState("");
  const [topOffset, setTopOffset] = useState(92);

  useEffect(() => {
    async function loadAnswers() {
      if (!questionId) {
        setImprovedError("Unable to load answers (no question ID).");
        setIsLoadingImproved(false);
        return;
      }
      setIsLoadingImproved(true);
      setImprovedError("");
      try {
        const response = await fetch(`/api/questions/${questionId}/answers?exclude=${currentAnswerId}`);
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Unable to load alternative answers.");
        }
        setAnswerCards(Array.isArray(result.answers) ? result.answers : []);
      } catch (error) {
        setAnswerCards([]);
        setImprovedError(error instanceof Error ? error.message : "Unable to load answers.");
      } finally {
        setIsLoadingImproved(false);
      }
    }
    loadAnswers();

    // Prevent background scrolling and match chatbot sticky behavior
    const scrollY = window.scrollY;
    setTopOffset(Math.max(0, 92 - scrollY));

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    
    // Calculate scrollbar width to prevent layout shift (vibration)
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.style.overflow = "hidden";
    
    return () => {
      document.body.style.paddingRight = originalPaddingRight;
      document.body.style.overflow = originalOverflow;
    };
  }, [questionId, currentAnswerId]);

  return (
    <div
      className={`improved-answer-overlay ${closing ? "is-closing" : ""}`}
      style={{ top: `${topOffset}px` }}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        aria-label="Available answers"
        className="improved-answer-popup"
        role="dialog"
        aria-modal="true"
      >
        <div className="improved-answer-head">
          <div>
            <p>Available answers</p>
            <h2>Open an improved answer</h2>
          </div>

          <button
            type="button"
            className="improved-answer-close"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {isLoadingImproved ? (
          <div className="improved-answer-state">Loading answers...</div>
        ) : improvedError ? (
          <div className="improved-answer-state error">{improvedError}</div>
        ) : answerCards.length === 0 ? (
          <div className="improved-answer-state">
            No other answers are available for this question.
          </div>
        ) : (
          <div className="improved-answer-grid">
            {answerCards.map((answer) => (
              <a
                aria-label={`Open ${answer.badge.toLowerCase()} answer by ${answer.authorName}`}
                className={`improved-answer-card ${
                  answer.source === "ai" ? "is-ai-answer" : ""
                }`}
                href={answer.href}
                key={`${answer.source}-${answer.id}`}
              >
                <div className="improved-answer-card-head">
                  <div className="improved-answer-author">
                    <AnswerAvatar
                      image={answer.authorImage}
                      initials={answer.authorInitials}
                    />
                    <div>
                      <b>{answer.authorName}</b>
                    </div>
                  </div>

                  <strong className={`improved-answer-badge ${answer.badge.toLowerCase()}`}>
                    {answer.badge}
                  </strong>
                </div>

                <p>{answer.preview}</p>

                <span className="improved-answer-open">Open</span>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
