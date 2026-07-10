"use client";

import Image from "next/image";
import type { ReactNode } from "react";

type AnswerToolbarProps = {
  isEditing: boolean;
  onEdit: () => void;
  onSave: (isPublic: boolean) => void;
  onCancel: () => void;
  onShare: () => void;
  onLike: () => void;
  onDislike: () => void;
  onGeneratePdf: () => void;
  pdfGenerating?: boolean;
  onImprovedAnswer: () => void;
  onInsights: () => void;
  onClimbupAi: () => void;
  feedback: "like" | "dislike" | null;
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

type AnswerFeedbackActionsProps = Pick<
  AnswerToolbarProps,
  "feedback" | "onShare" | "onLike" | "onDislike"
> & {
  likesCount?: number;
  dislikesCount?: number;
  reactionSaving?: boolean;
  canReact?: boolean;
};

type ToolIconKind =
  | "improve"
  | "pdf"
  | "answers"
  | "skills"
  | "save"
  | "private"
  | "public"
  | "add"
  | "theme"
  | "cancel"
  | "share"
  | "like"
  | "dislike";

const ClimbupMark = () => (
  <Image
    className="toolbar-btn-logo"
    src="/logo.png"
    alt=""
    width={32}
    height={32}
    aria-hidden
  />
);

const IconSvg = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

const toolIcons: Record<ToolIconKind, ReactNode> = {
  improve: (
    <Image src="/icons/improve.png" width={36} height={36} alt="Improve" className="toolbar-btn-logo" />
  ),
  pdf: (
    <Image src="/icons/pdf.png" width={36} height={36} alt="PDF" className="toolbar-btn-logo" />
  ),
  answers: (
    <Image src="/icons/community.png" width={36} height={36} alt="Community Answers" className="toolbar-btn-logo" />
  ),
  skills: (
    <Image src="/icons/skills.png" width={36} height={36} alt="Skills" className="toolbar-btn-logo" />
  ),
  save: (
    <IconSvg>
      <path d="M5 4h12l2 2v14H5z" />
      <path d="M8 4v6h8" />
      <path d="M8 20v-6h8v6" />
    </IconSvg>
  ),
  private: (
    <IconSvg>
      <path d="M6 10h12v10H6z" />
      <path d="M8 10V8a4 4 0 0 1 8 0v2" />
      <path d="M12 14v3" />
    </IconSvg>
  ),
  public: (
    <IconSvg>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a13 13 0 0 1 0 18" />
      <path d="M12 3a13 13 0 0 0 0 18" />
    </IconSvg>
  ),
  add: (
    <IconSvg>
      <path d="M5 5h14v14H5z" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </IconSvg>
  ),
  theme: (
    <Image src="/icons/sun.png" width={36} height={36} alt="Theme" className="toolbar-btn-logo" />
  ),
  cancel: (
    <IconSvg>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </IconSvg>
  ),
  share: (
    <IconSvg>
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M5 14v5h14v-5" />
    </IconSvg>
  ),
  like: (
    <IconSvg>
      <path d="M7 10v10H4V10z" />
      <path d="M7 10l4-7 1.4.8a2 2 0 0 1 .8 2.3L12 9h6.6a2 2 0 0 1 2 2.3l-1 6A3 3 0 0 1 16.7 20H7z" />
    </IconSvg>
  ),
  dislike: (
    <IconSvg>
      <g transform="rotate(180 12 12)">
        <path d="M7 10v10H4V10z" />
        <path d="M7 10l4-7 1.4.8a2 2 0 0 1 .8 2.3L12 9h6.6a2 2 0 0 1 2 2.3l-1 6A3 3 0 0 1 16.7 20H7z" />
      </g>
    </IconSvg>
  ),
};

const ToolIcon = ({ kind }: { kind: ToolIconKind }) => (
  <span className="toolbar-icon" data-kind={kind} aria-hidden>
    {toolIcons[kind]}
  </span>
);

function ToolLabel({ children }: { children: string }) {
  return <span className="toolbar-label">{children}</span>;
}

export default function AnswerToolbar({
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onGeneratePdf,
  pdfGenerating = false,
  onImprovedAnswer,
  onInsights,
  onClimbupAi,
  theme,
  onToggleTheme,
}: AnswerToolbarProps) {
  return (
    <div className="answer-toolbar">
      {!isEditing ? (
        <>
          <button
            className="toolbar-btn primary large-action"
            onClick={onEdit}
            aria-label="Improve answer"
            data-tooltip="Improve answer"
          >
            <ToolIcon kind="improve" />
            <ToolLabel>Improve Answer</ToolLabel>
          </button>

          <button
            className="toolbar-btn pdf-action"
            onClick={onGeneratePdf}
            disabled={pdfGenerating}
            aria-label="Generate PDF"
            aria-busy={pdfGenerating}
            data-tooltip={pdfGenerating ? "Preparing PDF" : "Generate PDF"}
          >
            <ToolIcon kind="pdf" />
            <ToolLabel>{pdfGenerating ? "Preparing" : "Generate PDF"}</ToolLabel>
          </button>

          <button
            className="toolbar-btn suggest-action"
            onClick={onImprovedAnswer}
            aria-label="Open Community Answers"
            data-tooltip="Community Answers"
          >
            <ToolIcon kind="answers" />
            <ToolLabel>Community Answers</ToolLabel>
          </button>

          <button
            className="toolbar-btn insights-action"
            onClick={onInsights}
            aria-label="Open skill insights"
            data-tooltip="Skill insights"
          >
            <ToolIcon kind="skills" />
            <ToolLabel>Skill insights</ToolLabel>
          </button>

          <button
            className="toolbar-btn ai-action"
            onClick={onClimbupAi}
            aria-label="Open ClimbUP AI"
            data-tooltip="ClimbUP AI"
          >
            <ClimbupMark />
            <ToolLabel>Climbup AI</ToolLabel>
          </button>

          <div className="toolbar-spacer" />

          <button
            className="toolbar-btn theme-action"
            onClick={onToggleTheme}
            type="button"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            data-tooltip={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            <ToolIcon kind="theme" />
            <ToolLabel>{theme === "dark" ? "Light mode" : "Dark mode"}</ToolLabel>
          </button>
        </>
      ) : (
        <>
          <button
            className="toolbar-btn success-action"
            onClick={() => onSave(false)}
            aria-label="Save private answer"
            data-tooltip="Save Private"
          >
            <ToolIcon kind="save" />
            <ToolLabel>Save Private</ToolLabel>
          </button>

          <button
            className="toolbar-btn public-action"
            onClick={() => onSave(true)}
            aria-label="Save public answer"
            data-tooltip="Save Public"
          >
            <ToolIcon kind="public" />
            <ToolLabel>Save Public</ToolLabel>
          </button>

          <button
            className="toolbar-btn theme-action"
            onClick={onToggleTheme}
            type="button"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            data-tooltip={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            <ToolIcon kind="theme" />
            <ToolLabel>{theme === "dark" ? "Light mode" : "Dark mode"}</ToolLabel>
          </button>

          <button
            className="toolbar-btn danger"
            onClick={onCancel}
            aria-label="Cancel editing"
            data-tooltip="Cancel"
          >
            <ToolIcon kind="cancel" />
            <ToolLabel>Cancel</ToolLabel>
          </button>
        </>
      )}
    </div>
  );
}

export function AnswerFeedbackActions({
  feedback,
  onShare,
  onLike,
  onDislike,
  likesCount = 0,
  dislikesCount = 0,
  reactionSaving = false,
  canReact = true,
}: AnswerFeedbackActionsProps) {
  const reactionsDisabled = reactionSaving || !canReact;

  return (
    <div className="answer-feedback-actions">
      <button
        className="toolbar-btn secondary-action"
        onClick={onShare}
        aria-label="Share answer"
        data-tooltip="Share"
      >
        <ToolIcon kind="share" />
        <ToolLabel>Share</ToolLabel>
      </button>

      <button
        className={`toolbar-btn icon-action reaction-action ${
          feedback === "like" ? "active-like" : ""
        }`}
        aria-pressed={feedback === "like"}
        disabled={reactionsDisabled}
        onClick={onLike}
        aria-label={`Like answer (${likesCount} likes)`}
        data-tooltip={canReact ? `Like (${likesCount})` : "Open a saved answer to react"}
      >
        <ToolIcon kind="like" />
        <span className="reaction-count">{likesCount}</span>
        <ToolLabel>Like</ToolLabel>
      </button>

      <button
        className={`toolbar-btn icon-action reaction-action ${
          feedback === "dislike" ? "active-dislike" : ""
        }`}
        aria-pressed={feedback === "dislike"}
        disabled={reactionsDisabled}
        onClick={onDislike}
        aria-label={`Dislike answer (${dislikesCount} dislikes)`}
        data-tooltip={
          canReact ? `Dislike (${dislikesCount})` : "Open a saved answer to react"
        }
      >
        <ToolIcon kind="dislike" />
        <span className="reaction-count">{dislikesCount}</span>
        <ToolLabel>Dislike</ToolLabel>
      </button>
    </div>
  );
}
