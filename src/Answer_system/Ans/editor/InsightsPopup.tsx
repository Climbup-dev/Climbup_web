import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

const INSIGHT_PROMPTS = [
  {
    label: "Skill gained",
    text: "I learned this particular skill: ",
  },
  {
    label: "Mistake avoided",
    text: "One mistake this answer helped me avoid is ",
  },
  {
    label: "Exam pattern",
    text: "The pattern I noticed from this answer is ",
  },
  {
    label: "Concept clarity",
    text: "This made the concept clear because ",
  },
];

type AnswerInsight = {
  insightId: string;
  title: string;
  insight: string;
  updatedAt: string;
  canEdit: boolean;
  authorName: string;
  authorImage: string;
  authorInitials: string;
};

type InsightsPopupProps = {
  answerId: string;
  closing: boolean;
  onClose: () => void;
  AnswerAvatar: React.ComponentType<{ image: string; initials: string }>;
};

function formatInsightDate(dateStr: string) {
  try {
    const date = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch (error) {
    return dateStr;
  }
}

export default function InsightsPopup({ answerId, closing, onClose, AnswerAvatar }: InsightsPopupProps) {
  const { currentUser } = useAuth();
  const [insights, setInsights] = useState<AnswerInsight[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(true);
  const [isSavingInsight, setIsSavingInsight] = useState(false);
  const [insightsError, setInsightsError] = useState("");
  const [insightsNotice, setInsightsNotice] = useState("");
  const [editingInsightId, setEditingInsightId] = useState("");
  const [insightText, setInsightText] = useState("");
  const [topOffset, setTopOffset] = useState(92);

  const loadInsights = async () => {
    setInsightsError("");
    setInsightsNotice("");
    if (!answerId) {
      setInsights([]);
      setInsightsError("Open a saved answer before viewing insights.");
      setIsLoadingInsights(false);
      return;
    }
    setIsLoadingInsights(true);
    try {
      const response = await fetch(`/api/answers/${answerId}/insights`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to load insights.");
      }
      setInsights(Array.isArray(result.insights) ? result.insights : []);
    } catch (error) {
      setInsights([]);
      setInsightsError(error instanceof Error ? error.message : "Unable to load insights.");
    } finally {
      setIsLoadingInsights(false);
    }
  };

  useEffect(() => {
    loadInsights();
    
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
  }, [answerId]);

  const submitInsight = async () => {
    setInsightsError("");
    setInsightsNotice("");
    if (!answerId) {
      setInsightsError("Open a saved answer before publishing an insight.");
      return;
    }
    if (!insightText.trim()) {
      setInsightsError("Write one skill, pattern, or thought before publishing.");
      return;
    }
    setIsSavingInsight(true);
    try {
      const endpoint = editingInsightId
        ? `/api/answers/${answerId}/insights/${editingInsightId}`
        : `/api/answers/${answerId}/insights`;

      const response = await fetch(endpoint, {
        method: editingInsightId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insight: insightText, title: "Reflection" }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to publish reflection.");
      }
      setInsightText("");
      setEditingInsightId("");
      await loadInsights();
      setInsightsNotice("Reflection published!");
    } catch (error) {
      setInsightsError(error instanceof Error ? error.message : "Unable to publish reflection.");
    } finally {
      setIsSavingInsight(false);
    }
  };

  const deleteInsight = async (insightId: string) => {
    if (!window.confirm("Delete this reflection?")) return;
    try {
      const response = await fetch(`/api/answers/${answerId}/insights/${insightId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete insight.");
      }
      await loadInsights();
      setInsightsNotice("Reflection removed.");
    } catch (error) {
      setInsightsError(error instanceof Error ? error.message : "Unable to delete insight.");
    }
  };

  const editInsight = (insight: AnswerInsight) => {
    setEditingInsightId(insight.insightId);
    setInsightText(insight.insight);
    setInsightsNotice("");
    setInsightsError("");
  };

  const resetInsightForm = () => {
    setEditingInsightId("");
    setInsightText("");
    setInsightsError("");
  };

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
        aria-label="Answer insights"
        className="improved-answer-popup insights-popup"
        role="dialog"
        aria-modal="true"
      >
        <div className="improved-answer-head">
          <div>
            <p>Answer insights</p>
            <h2>Skills students are building</h2>
          </div>
          <button type="button" className="improved-answer-close" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="insights-layout">
          <div className="insights-list">
            <div className="insights-list-head">
              <span>{insights.length} reflections</span>
              <strong>Student learning trail</strong>
            </div>

            {isLoadingInsights ? (
              <div className="improved-answer-state">Loading insights...</div>
            ) : insights.length === 0 ? (
              <div className="improved-answer-state">
                No reflections yet. Be the first to share what this answer sharpened.
              </div>
            ) : (
              insights.map((insight) => (
                <article className="insight-card" key={insight.insightId}>
                  <span className="insight-card-kind">Skill reflection</span>
                  <div className="improved-answer-author">
                    <AnswerAvatar image={insight.authorImage} initials={insight.authorInitials} />
                    <div>
                      <b>{insight.authorName}</b>
                      <small>{formatInsightDate(insight.updatedAt)}</small>
                    </div>
                  </div>
                  <p>{insight.insight}</p>
                  {insight.canEdit && (
                    <div className="insight-card-actions">
                      <button type="button" onClick={() => editInsight(insight)}>Edit</button>
                      <button type="button" className="danger" onClick={() => deleteInsight(insight.insightId)}>Delete</button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>

          <div className="insight-form">
            <div className="insight-composer-top">
              <span className="insight-composer-mark" aria-hidden>IN</span>
              <div>
                <h3>Publish a learning reflection</h3>
              </div>
            </div>

            <div className="insight-focus-row" aria-label="Reflection starters">
              {INSIGHT_PROMPTS.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  onClick={() => setInsightText((current) => (current.trim() ? current : prompt.text))}
                >
                  {prompt.label}
                </button>
              ))}
            </div>

            <label className="insight-textarea-field">
              <span>Your thought</span>
              <textarea
                value={insightText}
                onChange={(event) => setInsightText(event.target.value)}
                placeholder="Example : While studying Statistics, I learned how to analyze data instead of making assumptions."
                rows={7}
              />
            </label>

            <div className="insight-form-actions">
              <button
                type="button"
                className="toolbar-btn success-action"
                disabled={isSavingInsight}
                onClick={submitInsight}
              >
                {editingInsightId ? "Update reflection" : "Publish reflection"}
              </button>

              {editingInsightId && (
                <button type="button" className="toolbar-btn secondary-action" onClick={resetInsightForm}>
                  Cancel edit
                </button>
              )}
            </div>

            {insightsNotice && <div className="insight-inline-state success">{insightsNotice}</div>}
            {insightsError && <div className="insight-inline-state error">{insightsError}</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
