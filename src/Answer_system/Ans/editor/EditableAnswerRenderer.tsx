"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import AnswerRenderer from "../AnswerRenderer";
import AnswerToolbar, { AnswerFeedbackActions } from "./AnswerToolbar";
import AddBlockMenu from "./AddBlockMenu";
import BlockEditor from "./BlockEditor";
import { createAnswerEditorSnapshot } from "./answerSnapshot";
import { saveDummyAnswerSnapshot } from "./dummyAnswerStorage";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Feedback = "like" | "dislike" | null;
type AnswerTheme = "light" | "dark";
type PopupKind = "answers" | "insights";
type SaveMessageTone = "success" | "error";
type ReactionCounts = {
  likes: number;
  dislikes: number;
};
type LikeReactionRow = {
  user_id: string;
  reaction_type: "like" | "dislike" | string | null;
};
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

export default function EditableAnswerRenderer({
  data,
  questionId = "",
  answerId = "",
  answerSource = undefined,
  onSave = undefined,
}: EditableAnswerRendererProps) {
  const { currentUser } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const normalized = useMemo(() => normalizeAnswerData(data), [data]);
  const initialInsightAnswerId = answerId || "";
  const initialReactionSource = answerSource || undefined;

  const [isEditing, setIsEditing] = useState(false);
  const [editableBlocks, setEditableBlocks] = useState(() => normalized.blocks);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>({
    likes: 0,
    dislikes: 0,
  });
  const [reactionSaving, setReactionSaving] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveMessageTone, setSaveMessageTone] =
    useState<SaveMessageTone>("success");
  const [currentAnswerId, setCurrentAnswerId] = useState(initialInsightAnswerId);
  const [currentAnswerSource, setCurrentAnswerSource] = useState(
    initialReactionSource
  );
  const [answerCards, setAnswerCards] = useState<ImprovedAnswerCard[]>([]);
  const [showImprovedPopup, setShowImprovedPopup] = useState(false);
  const [closingPopup, setClosingPopup] = useState<PopupKind | null>(null);
  const [isLoadingImproved, setIsLoadingImproved] = useState(false);
  const [improvedError, setImprovedError] = useState("");
  const [showInsightsPopup, setShowInsightsPopup] = useState(false);
  const [insights, setInsights] = useState<AnswerInsight[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isSavingInsight, setIsSavingInsight] = useState(false);
  const [insightsError, setInsightsError] = useState("");
  const [insightsNotice, setInsightsNotice] = useState("");
  const [editingInsightId, setEditingInsightId] = useState("");
  const [insightText, setInsightText] = useState("");
  const pendingAddedBlockId = useRef("");
  const router = useRouter();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [theme, setTheme] = useState<AnswerTheme>(() => {
    if (typeof window === "undefined") return "dark";

    return window.localStorage.getItem("climbup-answer-theme") === "light"
      ? "light"
      : "dark";
  });

  useEffect(() => {
    if (!saveMessage) return;

    const timeout = window.setTimeout(
      () => setSaveMessage(""),
      saveMessageTone === "error" ? 5200 : 3400
    );

    return () => window.clearTimeout(timeout);
  }, [saveMessage, saveMessageTone]);

  useEffect(() => {
    let active = true;

    async function loadReactions() {
      if (!canSaveReaction(currentAnswerId, currentAnswerSource)) {
        setFeedback(null);
        setReactionCounts({ likes: 0, dislikes: 0 });
        return;
      }

      const { data: rows, error } = await supabase
        .from("likes")
        .select("user_id, reaction_type")
        .eq("answer_id", currentAnswerId);

      if (!active) return;

      if (error) {
        console.error("Unable to load reactions:", error.message);
        return;
      }

      const reactions = (rows || []) as LikeReactionRow[];
      const likes = reactions.filter((r) => r.reaction_type === "like").length;
      const dislikes = reactions.filter((r) => r.reaction_type === "dislike").length;
      const myReaction =
        reactions.find((r) => r.user_id === currentUser?.id)?.reaction_type || null;

      setReactionCounts({ likes, dislikes });
      setFeedback(
        myReaction === "like" || myReaction === "dislike" ? myReaction : null
      );
    }

    loadReactions();

    return () => {
      active = false;
    };
  }, [currentAnswerId, currentAnswerSource, currentUser?.id, supabase]);

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
    const nextBlock = createEmptyBlock(type);
    pendingAddedBlockId.current = nextBlock.id;
    setEditableBlocks((prev: any[]) => [...prev, nextBlock]);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const block = document.querySelector<HTMLElement>(
          `[data-editor-block-id="${pendingAddedBlockId.current}"]`
        );

        block?.scrollIntoView({ behavior: "smooth", block: "center" });
        pendingAddedBlockId.current = "";
      });
    });
  };

  const startEditing = () => {
    setEditableBlocks(normalized.blocks);
    setIsEditing(true);
  };

  const saveChanges = async (publish: boolean) => {
    setIsPublic(publish);
    setSaveMessage("");
    setSaveMessageTone("success");

    const snapshot = createAnswerEditorSnapshot({
      question: normalized.question,
      blocks: editableBlocks,
      isPublic: publish,
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
      isPublic: publish,
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
            publish,
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

        setSaveMessageTone("success");
        setSaveMessage(
          publish ? "Answer published successfully." : "Private draft saved."
        );

        if (result.answer?.answer_id) {
          setCurrentAnswerId(result.answer.answer_id);
          setCurrentAnswerSource("student_draft");
        }
      } catch (error) {
        setSaveMessageTone("error");
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
  };

  const cancelEdit = () => {
    setEditableBlocks(normalized.blocks);
    setIsEditing(false);
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

  const saveReaction = async (reactionType: Exclude<Feedback, null>) => {
    if (reactionSaving) return;

    if (!currentUser) {
      setSaveMessageTone("error");
      setSaveMessage("Please login to react.");
      return;
    }

    if (!canSaveReaction(currentAnswerId, currentAnswerSource)) {
      setSaveMessageTone("error");
      setSaveMessage(
        currentAnswerSource === "ai_answer"
          ? "Reactions are available on saved student answers. Save this answer first."
          : "Open a saved answer before reacting."
      );
      return;
    }

    const previousReaction = feedback;
    const previousCounts = reactionCounts;
    const nextReaction = previousReaction === reactionType ? null : reactionType;

    setReactionSaving(true);
    setFeedback(nextReaction);
    setReactionCounts(
      getOptimisticReactionCounts(previousCounts, previousReaction, nextReaction)
    );

    try {
      if (nextReaction) {
        const { error } = await supabase.from("likes").upsert(
          {
            answer_id: currentAnswerId,
            user_id: currentUser.id,
            reaction_type: nextReaction,
          },
          {
            onConflict: "user_id,answer_id",
          }
        );

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("answer_id", currentAnswerId)
          .eq("user_id", currentUser.id);

        if (error) throw error;
      }
    } catch (error) {
      console.error("Unable to save reaction:", error);
      setFeedback(previousReaction);
      setReactionCounts(previousCounts);
      setSaveMessageTone("error");
      setSaveMessage("Unable to save reaction. Please try again.");
    } finally {
      setReactionSaving(false);
    }
  };

  const handleLike = () => {
    saveReaction("like");
  };

  const handleDislike = () => {
    saveReaction("dislike");
  };

  const handleGeneratePdf = async () => {
    if (pdfGenerating) return;

    setPdfGenerating(true);
    setSaveMessage("");

    const snapshot = createAnswerEditorSnapshot({
      question: normalized.question,
      blocks: editableBlocks,
      isPublic,
      feedback,
    });
    const printWindow = window.open("about:blank", "climbup-answer-pdf");

    if (printWindow) {
      printWindow.document.write(
        "<!doctype html><title>Preparing PDF</title><body style=\"font-family:system-ui;padding:24px\">Preparing your PDF...</body>"
      );
      printWindow.document.close();
    }

    try {
      const { generateAnswerPdfDocument } = await import("./answerPdf");

      await generateAnswerPdfDocument(snapshot, { targetWindow: printWindow });

      setSaveMessageTone("success");
      setSaveMessage("PDF is ready. Use your browser print dialog to save it.");
    } catch (error) {
      printWindow?.close();
      console.error("Unable to generate PDF:", error);
      setSaveMessageTone("error");
      setSaveMessage("Unable to generate PDF. Please try again.");
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleImprovedAnswer = async () => {
    setFeedback((prev) => prev || "like");
    setClosingPopup(null);
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
    setInsightsNotice("");

    if (!currentAnswerId) {
      setInsights([]);
      setInsightsError(
        "Open a saved answer before viewing insights."
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
    setClosingPopup(null);
    setShowInsightsPopup(true);
    await loadInsights();
  };

  const closePopup = (popup: PopupKind) => {
    setClosingPopup(popup);
    window.setTimeout(() => {
      if (popup === "answers") {
        setShowImprovedPopup(false);
      } else {
        setShowInsightsPopup(false);
      }

      setClosingPopup((current) => (current === popup ? null : current));
    }, 180);
  };

  const resetInsightForm = () => {
    setEditingInsightId("");
    setInsightText("");
    setInsightsError("");
  };

  const submitInsight = async () => {
    setInsightsError("");
    setInsightsNotice("");

    if (!currentAnswerId) {
      setInsightsError(
        "Open a saved answer before publishing an insight."
      );
      return;
    }

    if (!insightText.trim()) {
      setInsightsError("Write one skill, pattern, or thought before publishing.");
      return;
    }

    setIsSavingInsight(true);

    try {
      const wasEditingInsight = Boolean(editingInsightId);
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
      setInsightsNotice(
        wasEditingInsight
          ? "Reflection updated. Your learning trail stays sharp."
          : "Published. Your thought can help another student learn with confidence."
      );
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
    setInsightsError("");
    setInsightsNotice("");
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
      setInsightsNotice("Reflection removed.");
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

  const handleGenerateWithAi = async () => {
    setIsGenerating(true);
    setGenerationError("");

    try {
      // 1. Generate answer using Python API
      const generateResponse = await fetch("http://localhost:8000/api/generate-only", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          question: normalized.question,
          question_id: questionId
        }),
      });

      if (!generateResponse.ok) {
        throw new Error("Failed to generate answer from AI server.");
      }

      const generateResult = await generateResponse.json();
      const generatedMarkdown = generateResult?.answer?.answer || generateResult?.answer;

      if (!generatedMarkdown) {
        throw new Error("Invalid response received from AI server.");
      }

      // 2. Save generated answer directly to the AI table using Next.js API
      if (questionId) {
        const saveResponse = await fetch(`/api/questions/${questionId}/ai-answers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answer: generatedMarkdown }),
        });

        const saveResult = await saveResponse.json();

        if (saveResult.ai_answer_id) {
          // Fetch the answer directly and effectively from the Supabase database
          const { data: dbData, error: dbError } = await supabase
            .from('ai_answers')
            .select('answer')
            .eq('ai_answer_id', saveResult.ai_answer_id)
            .single();

          if (dbError) throw dbError;

          if (dbData && dbData.answer) {
            setEditableBlocks(dbData.answer);
            setCurrentAnswerId(saveResult.ai_answer_id);
            setCurrentAnswerSource('ai_answer');
          }
        }
        
        // Also refresh Next.js cache in the background
        router.refresh();
      } else {
        throw new Error("Cannot save AI answer because question ID is missing.");
      }
      
    } catch (error) {
      console.error("AI Generation error:", error);
      setGenerationError(error instanceof Error ? error.message : "An unexpected error occurred.");
      setIsGenerating(false);
    }
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
      onShare={handleShare}
      onLike={handleLike}
      onDislike={handleDislike}
      onGeneratePdf={handleGeneratePdf}
      pdfGenerating={pdfGenerating}
      onImprovedAnswer={handleImprovedAnswer}
      onInsights={handleInsights}
      onClimbupAi={handleClimbupAi}
      feedback={feedback}
      theme={theme}
      onToggleTheme={toggleTheme}
      addBlockMenu={isEditing ? <AddBlockMenu onAdd={addBlock} /> : null}
    />

    {saveMessage && (
      <div
        aria-live={saveMessageTone === "error" ? "assertive" : "polite"}
        className={`answer-save-message ${saveMessageTone}`}
        role={saveMessageTone === "error" ? "alert" : "status"}
      >
        <span className="answer-save-message-icon" aria-hidden="true" />
        <span>{saveMessage}</span>
      </div>
    )}

    {!isEditing ? (
      <>
        {editableBlocks.length === 0 ? (
          <div className="ai-fallback-container">
            <div className="ai-fallback-content">
              <h3>No Answer Available</h3>
              <p>No answer is available yet. Generate one instantly using AI.</p>
              
              {generationError && (
                <div className="ai-fallback-error">{generationError}</div>
              )}

              {isGenerating ? (
                <div className="ai-generating-state">
                  <div className="ai-spinner"></div>
                  <span>Generating answer...</span>
                </div>
              ) : (
                <button 
                  className="toolbar-btn primary large-action ai-generate-btn"
                  onClick={handleGenerateWithAi}
                >
                  ✨ Generate with AI
                </button>
              )}
            </div>
          </div>
        ) : (
          <AnswerRenderer data={rendererData} />
        )}

        <AnswerFeedbackActions
          feedback={feedback}
          likesCount={reactionCounts.likes}
          dislikesCount={reactionCounts.dislikes}
          reactionSaving={reactionSaving}
          canReact={canSaveReaction(currentAnswerId, currentAnswerSource)}
          onShare={handleShare}
          onLike={handleLike}
          onDislike={handleDislike}
        />

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
            editableBlocks.map((block: any, index: number) => {
              const blockId = block.id || `${block.type}-${index}`;

              return (
                <div
                  className="editor-block-scroll-target"
                  data-editor-block-id={blockId}
                  key={blockId}
                >
                  <BlockEditor
                    block={block}
                    index={index}
                    onChange={updateBlock}
                    onDelete={deleteBlock}
                  />
                </div>
              );
            })
          )}
        </div>

        <AnswerFeedbackActions
          feedback={feedback}
          likesCount={reactionCounts.likes}
          dislikesCount={reactionCounts.dislikes}
          reactionSaving={reactionSaving}
          canReact={canSaveReaction(currentAnswerId, currentAnswerSource)}
          onShare={handleShare}
          onLike={handleLike}
          onDislike={handleDislike}
        />

      </>
    )}

    {showImprovedPopup && (
      <div
        className={`improved-answer-overlay ${
          closingPopup === "answers" ? "is-closing" : ""
        }`}
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closePopup("answers");
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
              onClick={() => closePopup("answers")}
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
    )}

    {showInsightsPopup && (
      <div
        className={`improved-answer-overlay ${
          closingPopup === "insights" ? "is-closing" : ""
        }`}
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closePopup("insights");
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

            <button
              type="button"
              className="improved-answer-close"
              onClick={() => closePopup("insights")}
            >
              Close
            </button>
          </div>

          <div className="insights-layout">
            <div className="insight-form">
              <div className="insight-composer-top">
                <span className="insight-composer-mark" aria-hidden>
                  IN
                </span>
                <div>
                  <h3>Publish a learning reflection</h3>
                </div>
              </div>

              <div className="insight-focus-row" aria-label="Reflection starters">
                {INSIGHT_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.label}
                    type="button"
                    onClick={() =>
                      setInsightText((current) =>
                        current.trim() ? current : prompt.text
                      )
                    }
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
                  placeholder="Example : While studying Statistics, I learned how to analyze data instead of making assumptions. I now compare my test scores and study patterns to identify what actually improves my performance."
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
                  <button
                    type="button"
                    className="toolbar-btn secondary-action"
                    onClick={resetInsightForm}
                  >
                    Cancel edit
                  </button>
                )}
              </div>

              {insightsNotice && (
                <div className="insight-inline-state success">
                  {insightsNotice}
                </div>
              )}

              {insightsError && (
                <div className="insight-inline-state error">
                  {insightsError}
                </div>
              )}
            </div>

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
                      <AnswerAvatar
                        image={insight.authorImage}
                        initials={insight.authorInitials}
                      />
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

function AnswerAvatar({
  image,
  initials,
}: {
  image: string;
  initials: string;
}) {
  const [failedImage, setFailedImage] = useState("");
  const showImage = Boolean(image && failedImage !== image);

  return (
    <span
      className={`improved-answer-avatar ${showImage ? "has-image" : ""}`}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedImage(image)}
        />
      ) : (
        initials
      )}
    </span>
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

function getOptimisticReactionCounts(
  counts: ReactionCounts,
  previousReaction: Feedback,
  nextReaction: Feedback
): ReactionCounts {
  const nextCounts = { ...counts };

  if (previousReaction === "like") {
    nextCounts.likes = Math.max(0, nextCounts.likes - 1);
  }

  if (previousReaction === "dislike") {
    nextCounts.dislikes = Math.max(0, nextCounts.dislikes - 1);
  }

  if (nextReaction === "like") {
    nextCounts.likes += 1;
  }

  if (nextReaction === "dislike") {
    nextCounts.dislikes += 1;
  }

  return nextCounts;
}

function canSaveReaction(
  answerId: string,
  answerSource: EditableAnswerRendererProps["answerSource"] | undefined
) {
  return Boolean(answerId && answerSource === "student_draft");
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
