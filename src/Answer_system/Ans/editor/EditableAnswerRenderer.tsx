"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import AnswerRenderer from "../AnswerRenderer";
import AnswerToolbar, { AnswerFeedbackActions } from "./AnswerToolbar";
import AddBlockMenu from "./AddBlockMenu";
import BlockEditor from "./BlockEditor";
import { createAnswerEditorSnapshot } from "./answerSnapshot";
import { saveDummyAnswerSnapshot } from "./dummyAnswerStorage";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import CommunityAnswersPopup from "./CommunityAnswersPopup";
import InsightsPopup from "./InsightsPopup";
import MathText from "@/components/MathText";

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
  answerSource?: "student_draft" | "ai_answer" | "student" | "ai" | null;
  hasImage?: boolean;
  questionImage?: string;
  onSave?: (data: any) => Promise<void>;
  author?: {
    name: string;
    avatarUrl: string | null;
  };
  answeredAt?: string;
  questionTitle?: string;
};

const AI_LOADING_MESSAGES = [
  "Analyzing your question carefully...",
  "Gathering the best engineering concepts...",
  "Structuring a perfect step-by-step answer...",
  "Adding relevant examples and details...",
  "Finalizing your premium answer..."
];

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
  hasImage = false,
  questionImage = undefined,
  onSave = undefined,
  author,
  answeredAt,
  questionTitle,
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
  const [currentAnswerId, setCurrentAnswerId] = useState(() => {
    return answerId || (answerSource === "student_draft"
      ? data?.answer_id
      : data?.answer?.answer_id || "");
  });
  const [currentAnswerSource, setCurrentAnswerSource] = useState(
    initialReactionSource
  );
  const [showImprovedPopup, setShowImprovedPopup] = useState(false);
  const [closingPopup, setClosingPopup] = useState<PopupKind | null>(null);
  const [showInsightsPopup, setShowInsightsPopup] = useState(false);
  const pendingAddedBlockId = useRef("");
  const router = useRouter();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [loadingMessage, setLoadingMessage] = useState(AI_LOADING_MESSAGES[0]);
  const [showAiWarning, setShowAiWarning] = useState(false);

  const [showHighlightTooltip, setShowHighlightTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<Range | null>(null);
  const [isRemovingHighlight, setIsRemovingHighlight] = useState(false);
  const [clickedMarkText, setClickedMarkText] = useState("");
  const [clickedBlockIndex, setClickedBlockIndex] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isGenerating) {
      setLoadingMessage(AI_LOADING_MESSAGES[0]);
      return;
    }
    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % AI_LOADING_MESSAGES.length;
      setLoadingMessage(AI_LOADING_MESSAGES[currentIndex]);
    }, 3000);
    return () => clearInterval(interval);
  }, [isGenerating]);
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

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      if (isEditing || !contentRef.current) return;
      
      // Check if we clicked on an existing highlight
      const targetElement = e.target as Element;
      const markElement = targetElement.closest("mark.highlight");
      
      if (markElement) {
        const text = markElement.textContent || "";
        const blockElement = markElement.closest('[data-block-index]');
        const blockIndexStr = blockElement?.getAttribute('data-block-index');
        
        if (text && blockIndexStr) {
          const rect = markElement.getBoundingClientRect();
          setTooltipPos({
            x: rect.left + rect.width / 2,
            y: rect.top + window.scrollY - 40,
          });
          setIsRemovingHighlight(true);
          setClickedMarkText(text);
          setClickedBlockIndex(parseInt(blockIndexStr, 10));
          setSelectedText(text);
          setShowHighlightTooltip(true);
          return;
        }
      }

      setIsRemovingHighlight(false);

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setShowHighlightTooltip(false);
        return;
      }
      const text = selection.toString().trim();
      if (!text || text.length < 5) {
        setShowHighlightTooltip(false);
        return;
      }
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setTooltipPos({
        x: rect.left + rect.width / 2,
        y: rect.top + window.scrollY - 40,
      });
      setSelectedText(text);
      setSelectionRange(range);
      setShowHighlightTooltip(true);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if ((e.target as Element).closest(".highlight-tooltip-container")) return;
      setShowHighlightTooltip(false);
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isEditing]);

  const updateBlock = useCallback((index: number, updatedBlock: any) => {
    setEditableBlocks((prev: any[]) =>
      prev.map((block: any, i: number) => (i === index ? updatedBlock : block))
    );
  }, []);

  const deleteBlock = useCallback((index: number) => {
    setEditableBlocks((prev: any[]) =>
      prev.filter((_: any, i: number) => i !== index)
    );
  }, []);

  const addBlockAt = useCallback((type: string, index: number) => {
    const nextBlock = createEmptyBlock(type);
    pendingAddedBlockId.current = nextBlock.id;
    setEditableBlocks((prev: any[]) => {
      const newBlocks = [...prev];
      newBlocks.splice(index, 0, nextBlock);
      return newBlocks;
    });

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const block = document.querySelector<HTMLElement>(
          `[data-editor-block-id="${pendingAddedBlockId.current}"]`
        );

        block?.scrollIntoView({ behavior: "smooth", block: "center" });
        pendingAddedBlockId.current = "";
      });
    });
  }, []);

  const silentSaveChanges = async (blocksToSave: any[]) => {
    try {
      if (!questionId) return;

      const snapshot = createAnswerEditorSnapshot({
        question: normalized.question,
        questionImage,
        blocks: blocksToSave,
        isPublic,
        feedback,
      });

      await fetch("/api/student-answers", {
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
    } catch (error) {
      console.error("Silent auto-save failed:", error);
    }
  };

  const applyHighlight = () => {
    if (!selectionRange) return;

    const textToHighlight = selectionRange.toString();
    if (!textToHighlight.trim()) return;

    let blockElement = selectionRange.commonAncestorContainer.parentElement?.closest('[data-block-index]');
    if (!blockElement) return;

    const blockIndexStr = blockElement.getAttribute('data-block-index');
    if (blockIndexStr === null) return;
    
    const blockIndex = parseInt(blockIndexStr, 10);
    const targetBlock = editableBlocks[blockIndex];

    if (targetBlock && targetBlock.type === 'markdown') {
      const contentKey = targetBlock.content !== undefined ? 'content' : (targetBlock.text !== undefined ? 'text' : 'description');
      const oldContent = targetBlock[contentKey] || "";
      
      if (oldContent.includes(textToHighlight)) {
        let newContent = oldContent.replace(textToHighlight, `<mark class="highlight">${textToHighlight}</mark>`);
        
        // Flatten any nested mark tags that might have been accidentally created
        newContent = newContent.replace(/<mark[^>]*>(.*?)<\/mark>/g, (match) => {
            const innerText = match.replace(/<\/?mark[^>]*>/g, '');
            return `<mark class="highlight">${innerText}</mark>`;
        });
        
        const newBlocks = [...editableBlocks];
        newBlocks[blockIndex] = {
          ...targetBlock,
          [contentKey]: newContent
        };
        
        setEditableBlocks(newBlocks);
        silentSaveChanges(newBlocks);
      }
    }

    setShowHighlightTooltip(false);
    window.getSelection()?.removeAllRanges();
  };

  const removeHighlight = () => {
    if (clickedBlockIndex === null || !clickedMarkText) return;
    
    const targetBlock = editableBlocks[clickedBlockIndex];
    if (targetBlock && targetBlock.type === 'markdown') {
      const contentKey = targetBlock.content !== undefined ? 'content' : (targetBlock.text !== undefined ? 'text' : 'description');
      const oldContent = targetBlock[contentKey] || "";
      
      const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`<mark[^>]*>\\s*${escapeRegExp(clickedMarkText)}\\s*<\\/mark>`, 'g');
      
      const newContent = oldContent.replace(regex, clickedMarkText);
      
      const newBlocks = [...editableBlocks];
      newBlocks[clickedBlockIndex] = {
        ...targetBlock,
        [contentKey]: newContent
      };
      
      setEditableBlocks(newBlocks);
      silentSaveChanges(newBlocks);
    }
    
    setShowHighlightTooltip(false);
  };

  const startEditing = () => {
    setEditableBlocks(normalized.blocks);
    setIsEditing(true);
  };

  const saveChanges = async (publish: boolean) => {
    setSaveMessage("");
    setSaveMessageTone("success");

    const snapshot = createAnswerEditorSnapshot({
      question: normalized.question,
      questionImage,
      blocks: editableBlocks,
      isPublic: publish,
      feedback,
    });

    if (publish) {
      try {
        setSaveMessage("Verifying answer against community guidelines...");
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          throw new Error("You must be logged in to publish answers.");
        }

        const pythonBackendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "https://bacend-climbup.onrender.com";
        const answerText = snapshot.answer.blocks.map((b: any) => {
          if (typeof b.content === 'string') return b.content;
          if (b.type === 'image' && b.url) return `[Image: ${b.url}] ${b.search_query || ''}`;
          if (b.type === 'code' && b.code) return `\`\`\`\n${b.code}\n\`\`\``;
          return b.text || b.description || "";
        }).join("\\n");
        
        const verifyRes = await fetch(`${pythonBackendUrl}/api/verify-answer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            question: normalized.question,
            answer: answerText
          })
        });

        if (!verifyRes.ok) {
          const errText = await verifyRes.text();
          console.error("Verification backend error:", verifyRes.status, errText);
          throw new Error(`Server Error (${verifyRes.status}): ${errText.substring(0, 50)}...`);
        }

        const verifyData = await verifyRes.json();
        
        if (!verifyData.is_valid) {
          setSaveMessage(`Cannot publish yet. Please fix this issue: ${verifyData.reason}`);
          setSaveMessageTone("error");
          return; // Abort saving as public
        }
        setSaveMessage("Answer approved by Climbup");
      } catch (error: any) {
        console.error("Verification failed:", error);
        setSaveMessageTone("error");
        setSaveMessage(error.message || "Failed to verify the answer. Please try again.");
        return; // Abort saving if verification fails
      }
    }

    setIsPublic(publish);

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
      questionImage,
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
  };

  // The fetch logic for Community Answers was moved to CommunityAnswersPopup.tsx

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

  const handleInsights = () => {
    setClosingPopup(null);
    setShowInsightsPopup(true);
  };

  const handleClimbupAi = () => {
    if (typeof window !== "undefined") {
      // Use questionTitle if available, otherwise fallback to normalized.question
      const contextText = questionTitle || normalized.question;
      window.dispatchEvent(
        new CustomEvent("climbup-ai-open", {
          detail: { question: contextText, theme: theme },
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

  const handleGenerateWithAi = () => {
    setShowAiWarning(true);
  };

  const confirmGenerateWithAi = async () => {
    setShowAiWarning(false);
    setIsGenerating(true);
    setGenerationError("");

    if (hasImage) {
      setGenerationError("AI is currently unable to read images. Please attempt this question manually.");
      setIsGenerating(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        alert("Unauthorized: Your session expired. Please login again.");
        setIsGenerating(false);
        return;
      }

      // 1. Generate answer using Python backend directly
      const pythonBackendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "https://bacend-climbup.onrender.com";
      const targetUrl = `${pythonBackendUrl}/api/generate-only`;
      
      const generateResponse = await fetch(targetUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          question: normalized.question,
          marks: 5,
          question_id: questionId,
          skip_answer: false
        }),
      });

      if (!generateResponse.ok) {
        if (generateResponse.status === 401) {
          alert("Unauthorized: Your session expired. Please login again.");
        } else {
          throw new Error("Failed to generate answer from AI server.");
        }
        setIsGenerating(false);
        return;
      }

      const generateResult = await generateResponse.json();

      if (generateResult.answer?.is_error) {
          alert("AI Limit Reached. Please try again later.");
          setIsGenerating(false);
          return;
      }

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
            setSaveMessageTone("success");
            setSaveMessage("Answer automatically generated and saved.");
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
  <div className={`editable-answer-page answer-theme-${theme}`} ref={contentRef}>


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
                  <span className="ai-loading-text" style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>{loadingMessage}</span>
                </div>
              ) : (
                <button 
                  className="toolbar-btn primary large-action ai-generate-btn"
                  onClick={handleGenerateWithAi}
                >
                  ✨ Generate by Climbup
                </button>
              )}
            </div>
          </div>
        ) : (
          <AnswerRenderer data={rendererData} author={author} answeredAt={answeredAt} questionImage={questionImage} />
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
            <h1><MathText text={normalized.question} /></h1>
            {questionImage && (
              <img src={questionImage} alt="Question Diagram" className="question-diagram" style={{ maxWidth: '100%', marginTop: '16px', borderRadius: '8px' }} />
            )}
          </div>

          {author && (
            <div className="answer-author-tag">
              <AnswerAvatar
                image={author.avatarUrl || ""}
                initials={author.name === "ClimbUP AI" ? "✨" : author.name.charAt(0).toUpperCase()}
              />
              <div className="answer-author-tag-info">
                <span className="answer-author-tag-label">Answered by</span>
                <b className="answer-author-tag-name">{author.name}</b>
                {answeredAt && (
                  <span className="answer-author-tag-date">• {formatAuthorDate(answeredAt)}</span>
                )}
              </div>
            </div>
          )}

          {editableBlocks.length === 0 ? (
            <div className="block empty-answer">
              <AddBlockMenu onAdd={(type) => addBlockAt(type, 0)} />
            </div>
          ) : (
            <>
              <AddBlockMenu onAdd={(type) => addBlockAt(type, 0)} />
              {editableBlocks.map((block: any, index: number) => {
                const blockId = block.id || `${block.type}-${index}`;

                return (
                  <div key={blockId} data-block-index={index}>
                    <div
                      className="editor-block-scroll-target"
                      data-editor-block-id={blockId}
                    >
                      <BlockEditor
                        block={block}
                        index={index}
                        onChange={updateBlock}
                        onDelete={deleteBlock}
                      />
                    </div>
                    <AddBlockMenu onAdd={(type) => addBlockAt(type, index + 1)} />
                  </div>
                );
              })}
            </>
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
    />

    {showImprovedPopup && typeof document !== "undefined" && createPortal(
      <div className={`editable-answer-page answer-theme-${theme}`}>
        <CommunityAnswersPopup
          questionId={questionId}
          currentAnswerId={currentAnswerId}
          closing={closingPopup === "answers"}
          onClose={() => closePopup("answers")}
          AnswerAvatar={AnswerAvatar}
        />
      </div>,
      document.body
    )}

    {showInsightsPopup && typeof document !== "undefined" && createPortal(
      <div className={`editable-answer-page answer-theme-${theme}`}>
        <InsightsPopup
          answerId={currentAnswerId}
          closing={closingPopup === "insights"}
          onClose={() => closePopup("insights")}
          AnswerAvatar={AnswerAvatar}
        />
      </div>,
      document.body
    )}

    {showAiWarning && (
      <div className="custom-ai-modal-overlay">
        <div className="custom-ai-modal-content">
          <div className="modal-icon-wrapper">
            <span className="modal-icon">🤖</span>
          </div>
          <h3>AI Generation Warning</h3>
          <p>AI can occasionally make mistakes. Please verify the generated answer thoroughly for accuracy.</p>
          <div className="modal-actions">
            <button type="button" className="modal-btn-cancel" onClick={() => setShowAiWarning(false)}>Cancel</button>
            <button type="button" className="modal-btn-okay" onClick={confirmGenerateWithAi}>Okay</button>
          </div>
        </div>
      </div>
    )}
      {showHighlightTooltip && (
          <div
            className="highlight-tooltip-container"
            style={{
              position: "absolute",
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
              transform: "translateX(-50%)",
              zIndex: 1000,
              display: "flex",
              gap: "4px",
              background: "#1e293b",
              borderRadius: "8px",
              padding: "4px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
              animation: "tooltipPop 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <button
              style={{
                background: isRemovingHighlight ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s ease"
              }}
              className="tooltip-btn highlight-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isRemovingHighlight) {
                  removeHighlight();
                } else {
                  applyHighlight();
                }
              }}
            >
              {isRemovingHighlight ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                  <path d="M2 2l7.586 7.586"></path>
                  <circle cx="11" cy="11" r="2"></circle>
                </svg>
              )}
              {isRemovingHighlight ? "Remove" : "Highlight"}
            </button>
            <button
              style={{
                background: "transparent",
                color: "#94a3b8",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s ease"
              }}
              className="tooltip-btn ask-ai-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.dispatchEvent(
                  new CustomEvent("climbup-ai-fill-input", {
                    detail: { text: `Explain this to me: "${selectedText}"` },
                  })
                );
                setShowHighlightTooltip(false);
                window.getSelection()?.removeAllRanges();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Ask AI
            </button>
          </div>
        )}
        <style jsx global>{`
          @keyframes tooltipPop {
            0% { transform: translate(-50%, 10px) scale(0.8); opacity: 0; }
            100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
          }
          .tooltip-btn:hover {
            transform: translateY(-1px);
          }
          .highlight-btn:hover {
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
          }
          .ask-ai-btn:hover {
            color: #fff !important;
            background: rgba(255, 255, 255, 0.1) !important;
          }
        `}</style>
    </div>
  );
}

function formatAuthorDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return "";
  }
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
