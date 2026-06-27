"use client";

import Image from "next/image";
import type { ReactNode } from "react";

type AnswerToolbarProps = {
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onShare: () => void;
  onLike: () => void;
  onDislike: () => void;
  onMakePublic: () => void;
  onGeneratePdf: () => void;
  addBlockMenu?: ReactNode;
  onImprovedAnswer: () => void;
  onInsights: () => void;
  onClimbupAi: () => void;
  feedback: "like" | "dislike" | null;
  isPublic: boolean;
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
    <IconSvg>
      <path d="M4 20l4.5-1.1 9.8-9.8a2.1 2.1 0 0 0 0-3l-.4-.4a2.1 2.1 0 0 0-3 0l-9.8 9.8L4 20z" />
      <path d="M13.8 6.8l3.4 3.4" />
      <path d="M5 5h4" />
      <path d="M7 3v4" />
    </IconSvg>
  ),
  pdf: (
    <IconSvg>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5" />
      <text x="7.2" y="16.7" fill="currentColor" stroke="none" fontSize="5.2" fontWeight="900">
        PDF
      </text>
    </IconSvg>
  ),
  answers: (
    <IconSvg>
      <path d="M4 6.5h11a3 3 0 0 1 3 3v1.5a3 3 0 0 1-3 3H9l-4 3v-3.1A3 3 0 0 1 4 11z" />
      <path d="M8 10h6" />
      <path d="M8 13h4" />
    </IconSvg>
  ),
  skills: (
    <IconSvg>
      <path d="M4 19h16" />
      <path d="M6 19v-6" />
      <path d="M12 19v-9" />
      <path d="M18 19v-12" />
      <path d="M5 8l4-4 4 4 6-6" />
    </IconSvg>
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
    <IconSvg>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.9 4.9l1.4 1.4" />
      <path d="M17.7 17.7l1.4 1.4" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.9 19.1l1.4-1.4" />
      <path d="M17.7 6.3l1.4-1.4" />
    </IconSvg>
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
  onMakePublic,
  onGeneratePdf,
  addBlockMenu = null,
  onImprovedAnswer,
  onInsights,
  onClimbupAi,
  isPublic,
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
            <ToolLabel>Improve</ToolLabel>
          </button>

          <button
            className="toolbar-btn pdf-action"
            onClick={onGeneratePdf}
            aria-label="Generate PDF"
            data-tooltip="Generate PDF"
          >
            <ToolIcon kind="pdf" />
            <ToolLabel>Generate PDF</ToolLabel>
          </button>

          <button
            className="toolbar-btn suggest-action"
            onClick={onImprovedAnswer}
            aria-label="Open available answers"
            data-tooltip="Available answers"
          >
            <ToolIcon kind="answers" />
            <ToolLabel>Answers</ToolLabel>
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
          {addBlockMenu && (
            <div className="toolbar-block-options">{addBlockMenu}</div>
          )}

          <button
            className="toolbar-btn success-action"
            onClick={onSave}
            aria-label={isPublic ? "Save public answer" : "Save private answer"}
            data-tooltip={isPublic ? "Save Public" : "Save Private"}
          >
            <ToolIcon kind="save" />
            <ToolLabel>{isPublic ? "Save Public" : "Save Private"}</ToolLabel>
          </button>

          <div
            className="earning-badge"
            aria-label={isPublic ? "Public answer" : "Private answer"}
            data-tooltip={isPublic ? "Public Answer" : "Private Answer"}
          >
            <ToolIcon kind={isPublic ? "public" : "private"} />
            <ToolLabel>{isPublic ? "Public answer" : "Private answer"}</ToolLabel>
          </div>

          <button
            className="toolbar-btn public-action"
            onClick={onMakePublic}
            aria-label={isPublic ? "Make answer private" : "Make answer public"}
            data-tooltip={isPublic ? "Make Private" : "Make Public"}
          >
            <ToolIcon kind={isPublic ? "private" : "public"} />
            <ToolLabel>{isPublic ? "Make Private" : "Make Public"}</ToolLabel>
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
