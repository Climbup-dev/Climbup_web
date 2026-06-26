"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from "react";
import AnswerRenderer from "../AnswerRenderer";
import AnswerToolbar, { AnswerFeedbackActions } from "./AnswerToolbar";
import AddBlockMenu from "./AddBlockMenu";
import { generateAnswerPdfDocument } from "./answerPdf";
import BlockEditor from "./BlockEditor";
import { createAnswerEditorSnapshot } from "./answerSnapshot";
import { saveDummyAnswerSnapshot } from "./dummyAnswerStorage";

type Feedback = "like" | "dislike" | null;
type AnswerTheme = "light" | "dark";
type ImprovedAnswerCard = {
  id: string;
  source: "ai" | "student";
  label: string;
  status: string;
  meta: string;
  preview: string;
  href: string;
  authorName: string;
  authorImage: string;
  authorInitials: string;
};
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

type EditableAnswerRendererProps = {
  data: any;
  questionId?: string;
  answerId?: string;
  answerSource?: "student_draft" | "ai_answer";
  onSave?: (data: any) => void;
};

export default function EditableAnswerRenderer({
  data,
  questionId = "",
  answerId = "",
  answerSource = undefined,
  onSave = undefined,
}: EditableAnswerRendererProps) {
  const normalized = useMemo(() => normalizeAnswerData(data), [data]);
  const initialInsightAnswerId =
    answerSource === "student_draft" ? answerId : "";

  const [isEditing, setIsEditing] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editableBlocks, setEditableBlocks] = useState(() => normalized.blocks);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [currentAnswerId, setCurrentAnswerId] = useState(initialInsightAnswerId);
  const [answerCards, setAnswerCards] = useState<ImprovedAnswerCard[]>([]);
  const [showImprovedPopup, setShowImprovedPopup] = useState(false);
  const [isLoadingImproved, setIsLoadingImproved] = useState(false);
  const [improvedError, setImprovedError] = useState("");
  const [showInsightsPopup, setShowInsightsPopup] = useState(false);
  const [insights, setInsights] = useState<AnswerInsight[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isSavingInsight, setIsSavingInsight] = useState(false);
  const [insightsError, setInsightsError] = useState("");
  const [editingInsightId, setEditingInsightId] = useState("");
  const [insightText, setInsightText] = useState("");
  const [theme, setTheme] = useState<AnswerTheme>(() => {
    if (typeof window === "undefined") return "dark";

    return window.localStorage.getItem("climbup-answer-theme") === "light"
      ? "light"
      : "dark";
  });

  const updateBlock = (index: number, updatedBlock: any) => {
    setEditableBlocks((prev: any[]) =>
      prev.map((block: any, i: number) => (i === index ? updatedBlock : block))
    );
  };

  const deleteBlock = (index: number) => {
    setEditableBlocks((prev: any[]) =>
      prev.filter((_: any, i: number) => i !== index)
    );
  };

  const addBlock = (type: string) => {
    setEditableBlocks((prev: any[]) => [...prev, createEmptyBlock(type)]);
    setShowAddMenu(false);
  };

  const startEditing = () => {
    setEditableBlocks(normalized.blocks);
    setIsEditing(true);
    setShowAddMenu(false);
  };

  const saveChanges = async () => {
    setSaveMessage("");

    const snapshot = createAnswerEditorSnapshot({
      question: normalized.question,
      blocks: editableBlocks,
      isPublic,
      feedback,
    });

    const updatedData = {
      ...data,
      answer: {
        ...(data?.answer || {}),
        question: normalized.question,
        answer: snapshot.answer.blocks,
      },
      editorSnapshot: snapshot,
      isPublic,
      feedback,
      updatedAt: Date.now(),
    };

    onSave?.(updatedData);

    if (questionId) {
      try {
        const response = await fetch("/api/student-answers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            questionId,
            answerJson: snapshot,
            publish: isPublic,
          }),
        });

        const result = (await response.json()) as {
          ok?: boolean;
          error?: string;
          answer?: {
            answer_id?: string;
          };
        };

        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Unable to save answer.");
        }

        setSaveMessage(
          isPublic ? "Answer published successfully." : "Private draft saved."
        );

        if (result.answer?.answer_id) {
          setCurrentAnswerId(result.answer.answer_id);
        }
      } catch (error) {
        setSaveMessage(
          error instanceof Error ? error.message : "Unable to save answer."
        );
      }
    }

    try {
      await saveDummyAnswerSnapshot(snapshot);
    } catch (error) {
      console.error("Dummy answer snapshot save failed:", error);
    }

    setIsEditing(false);
    setShowAddMenu(false);
  };

  const cancelEdit = () => {
    setEditableBlocks(normalized.blocks);
    setIsEditing(false);
    setShowAddMenu(false);
  };

  const handleShare = async () => {
    const shareText = normalized.question || "Engineering answer";

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: shareText,
          text: shareText,
          url: window.location.href,
        });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  const handleLike = () => {
    setFeedback((prev) => (prev === "like" ? null : "like"));
  };

  const handleDislike = () => {
    setFeedback((prev) => (prev === "dislike" ? null : "dislike"));
  };

  const handleMakePublic = () => {
    setIsPublic((prev) => !prev);
  };

  const handleGeneratePdf = () => {
    generateAnswerPdfDocument({
      question: normalized.question,
      blocks: editableBlocks,
    });
  };

  const handleImprovedAnswer = async () => {
    setFeedback((prev) => prev || "like");
    setShowImprovedPopup(true);
    setImprovedError("");

    if (!questionId) {
      setAnswerCards([]);
      setImprovedError("Question id is missing.");
      return;
    }

    setIsLoadingImproved(true);

    try {
      const response = await fetch(`/api/questions/${questionId}/answers`, {
        cache: "no-store",
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        answers?: ImprovedAnswerCard[];
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to load answers.");
      }

      setAnswerCards(Array.isArray(result.answers) ? result.answers : []);
    } catch (error) {
      setAnswerCards([]);
      setImprovedError(
        error instanceof Error ? error.message : "Unable to load answers."
      );
    } finally {
      setIsLoadingImproved(false);
    }
  };

  const loadInsights = async () => {
    setInsightsError("");

    if (!currentAnswerId) {
      setInsights([]);
      setInsightsError(
        "Insights can be added after this is saved as a student answer."
      );
      return;
    }

    setIsLoadingInsights(true);

    try {
      const response = await fetch(`/api/answers/${currentAnswerId}/insights`, {
        cache: "no-store",
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        insights?: AnswerInsight[];
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to load insights.");
      }

      setInsights(Array.isArray(result.insights) ? result.insights : []);
    } catch (error) {
      setInsights([]);
      setInsightsError(
        error instanceof Error ? error.message : "Unable to load insights."
      );
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const handleInsights = async () => {
    setShowInsightsPopup(true);
    await loadInsights();
  };

  const resetInsightForm = () => {
    setEditingInsightId("");
    setInsightText("");
  };

  const submitInsight = async () => {
    setInsightsError("");

    if (!currentAnswerId) {
      setInsightsError(
        "Insights can be added after this is saved as a student answer."
      );
      return;
    }

    if (!insightText.trim()) {
      setInsightsError("Insight is required.");
      return;
    }

    setIsSavingInsight(true);

    try {
      const endpoint = editingInsightId
        ? `/api/insights/${editingInsightId}`
        : `/api/answers/${currentAnswerId}/insights`;
      const response = await fetch(endpoint, {
        method: editingInsightId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Insight",
          insight: insightText,
        }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to save insight.");
      }

      resetInsightForm();
      await loadInsights();
    } catch (error) {
      setInsightsError(
        error instanceof Error ? error.message : "Unable to save insight."
      );
    } finally {
      setIsSavingInsight(false);
    }
  };

  const editInsight = (insight: AnswerInsight) => {
    setEditingInsightId(insight.insightId);
    setInsightText(insight.insight);
  };

  const deleteInsight = async (insightId: string) => {
    setInsightsError("");

    try {
      const response = await fetch(`/api/insights/${insightId}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to delete insight.");
      }

      if (editingInsightId === insightId) {
        resetInsightForm();
      }

      await loadInsights();
    } catch (error) {
      setInsightsError(
        error instanceof Error ? error.message : "Unable to delete insight."
      );
    }
  };

  const handleClimbupAi = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("climbup-ai-open", {
          detail: { question: normalized.question },
        })
      );
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => {
      const nextTheme = prev === "dark" ? "light" : "dark";

      if (typeof window !== "undefined") {
        window.localStorage.setItem("climbup-answer-theme", nextTheme);
      }

      return nextTheme;
    });
  };

  const rendererData = {
    ...data,
    answer: {
      ...(data?.answer || {}),
      question: normalized.question,
      answer: editableBlocks,
    },
    isPublic,
    feedback,
  };

  return (
  <div className={`editable-answer-page answer-theme-${theme}`}>
    <AnswerToolbar
      isEditing={isEditing}
      onEdit={startEditing}
      onSave={saveChanges}
      onCancel={cancelEdit}
      onAddBlock={() => setShowAddMenu((prev) => !prev)}
      onShare={handleShare}
      onLike={handleLike}
      onDislike={handleDislike}
      onMakePublic={handleMakePublic}
      onGeneratePdf={handleGeneratePdf}
      onImprovedAnswer={handleImprovedAnswer}
      onInsights={handleInsights}
      onClimbupAi={handleClimbupAi}
      feedback={feedback}
      isPublic={isPublic}
      theme={theme}
      onToggleTheme={toggleTheme}
    />

    {!isEditing ? (
      <>
        <AnswerRenderer data={rendererData} />

        <AnswerFeedbackActions
          feedback={feedback}
          onShare={handleShare}
          onLike={handleLike}
          onDislike={handleDislike}
        />

        {saveMessage && (
          <div className="answer-save-message" role="status">
            {saveMessage}
          </div>
        )}
      </>
    ) : (
      <>
        <div className="answer-container">
          <div className="question-header">
            <div className="question-label">Question</div>
            <h1>{normalized.question}</h1>
          </div>

          {editableBlocks.length === 0 ? (
            <div className="block empty-answer">
              No blocks available. Click Add Block to create one.
            </div>
          ) : (
            editableBlocks.map((block: any, index: number) => (
              <BlockEditor
                key={block.id || `${block.type}-${index}`}
                block={block}
                index={index}
                onChange={updateBlock}
                onDelete={deleteBlock}
              />
            ))
          )}
        </div>

        {showAddMenu && (
          <div className="bottom-add-block-wrapper">
            <AddBlockMenu onAdd={addBlock} />
          </div>
        )}

        <AnswerFeedbackActions
          feedback={feedback}
          onShare={handleShare}
          onLike={handleLike}
          onDislike={handleDislike}
        />

        {saveMessage && (
          <div className="answer-save-message" role="status">
            {saveMessage}
          </div>
        )}
      </>
    )}

    {showImprovedPopup && (
      <div
        className="improved-answer-overlay"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setShowImprovedPopup(false);
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
              onClick={() => setShowImprovedPopup(false)}
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
                  className="improved-answer-card"
                  href={answer.href}
                  key={`${answer.source}-${answer.id}`}
                >
                  <div className="improved-answer-card-top">
                    <span>{answer.label}</span>
                    <strong>{answer.status}</strong>
                  </div>
                  <div className="improved-answer-author">
                    {answer.authorImage ? (
                      <span
                        className="improved-answer-avatar has-image"
                        style={{
                          backgroundImage: `url(${answer.authorImage})`,
                        }}
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="improved-answer-avatar" aria-hidden>
                        {answer.authorInitials}
                      </span>
                    )}
                  <div>
                      <b>{answer.authorName}</b>
                      <small>{answer.meta}</small>
                    </div>
                  </div>
                  <p>{answer.preview}</p>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    )}

    {showInsightsPopup && (
      <div
        className="improved-answer-overlay"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setShowInsightsPopup(false);
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
              <h2>Notes from students</h2>
            </div>

            <button
              type="button"
              className="improved-answer-close"
              onClick={() => setShowInsightsPopup(false)}
            >
              Close
            </button>
          </div>

          <div className="insights-layout">
            <div className="insight-form">
              <label>
                <span>Insight</span>
                <textarea
                  value={insightText}
                  onChange={(event) => setInsightText(event.target.value)}
                  placeholder="Write your insight..."
                  rows={5}
                />
              </label>

              <div className="insight-form-actions">
                <button
                  type="button"
                  className="toolbar-btn success-action"
                  disabled={isSavingInsight}
                  onClick={submitInsight}
                >
                  {editingInsightId ? "Update insight" : "Publish"}
                </button>

                {editingInsightId && (
                  <button
                    type="button"
                    className="toolbar-btn secondary-action"
                    onClick={resetInsightForm}
                  >
                    Cancel edit
                  </button>
                )}
              </div>

              {insightsError && (
                <div className="improved-answer-state error">
                  {insightsError}
                </div>
              )}
            </div>

            <div className="insights-list">
              {isLoadingInsights ? (
                <div className="improved-answer-state">Loading insights...</div>
              ) : insights.length === 0 ? (
                <div className="improved-answer-state">
                  No insights are available for this answer yet.
                </div>
              ) : (
                insights.map((insight) => (
                  <article className="insight-card" key={insight.insightId}>
                    <div className="improved-answer-author">
                      {insight.authorImage ? (
                        <span
                          className="improved-answer-avatar has-image"
                          style={{
                            backgroundImage: `url(${insight.authorImage})`,
                          }}
                          aria-hidden="true"
                        />
                      ) : (
                        <span className="improved-answer-avatar" aria-hidden>
                          {insight.authorInitials}
                        </span>
                      )}
                      <div>
                        <b>{insight.authorName}</b>
                        <small>{formatInsightDate(insight.updatedAt)}</small>
                      </div>
                    </div>

                    <p>{insight.insight}</p>

                    {insight.canEdit && (
                      <div className="insight-card-actions">
                        <button
                          type="button"
                          onClick={() => editInsight(insight)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => deleteInsight(insight.insightId)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    )}
  </div>
);
}

function normalizeAnswerData(data: any) {
  if (
    data?.answer &&
    typeof data.answer === "object" &&
    Array.isArray(data.answer.answer)
  ) {
    return {
      question: data.answer.question || data.question || "Question unavailable",
      blocks: data.answer.answer,
    };
  }

  if (data?.question && Array.isArray(data?.answer)) {
    return {
      question: data.question,
      blocks: data.answer,
    };
  }

  return {
    question:
      data?.answer?.question ||
      data?.question ||
      "Question unavailable",
    blocks: [],
  };
}

function createEmptyBlock(type: string) {
  const id = `${type}-${Date.now()}`;

  switch (type) {
    case "markdown":
      return {
        id,
        type: "markdown",
        title: "New Text",
        content: "Write your content here...",
      };

    case "image":
      return {
        id,
        type: "image",
        title: "New Image",
        url: "",
        search_query: "",
        recommended_websites: [],
      };

    case "table":
      return {
        id,
        type: "table",
        title: "New Table",
        columns: ["Column 1", "Column 2"],
        rows: [["", ""]],
      };

    case "steps":
      return {
        id,
        type: "steps",
        title: "New Steps",
        items: [{ content: "First step" }],
      };

    case "code":
      return {
        id,
        type: "code",
        title: "New Code",
        language: "text",
        content: "",
      };

    case "mermaid":
      return {
        id,
        type: "mermaid",
        title: "New Diagram",
        diagram_type: "flowchart",
        content: "A[Start] --> B[End]",
      };

    default:
      return {
        id,
        type: "markdown",
        title: "New Block",
        content: "",
      };
  }
}

function formatInsightDate(value: string) {
  if (!value) return "Just now";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
