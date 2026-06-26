"use client";

import Image from "next/image";

type AnswerToolbarProps = {
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onAddBlock: () => void;
  onShare: () => void;
  onLike: () => void;
  onDislike: () => void;
  onMakePublic: () => void;
  onGeneratePdf: () => void;
  onImprovedAnswer: () => void;
  onInsights: () => void;
  onClimbupAi: () => void;
  feedback: "like" | "dislike" | null;
  isPublic: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

const ClimbupMark = () => (
  <Image
    className="toolbar-btn-logo"
    src="/logo.png"
    alt=""
    width={22}
    height={22}
    aria-hidden
  />
);

const NameMark = ({ label }: { label: string }) => (
  <span className="toolbar-name-mark" aria-hidden>
    {label}
  </span>
);

export default function AnswerToolbar({
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onAddBlock,
  onMakePublic,
  onGeneratePdf,
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
          <button className="toolbar-btn primary large-action" onClick={onEdit}>
            <NameMark label="UP" />
            Improve
          </button>

          <button className="toolbar-btn pdf-action" onClick={onGeneratePdf}>
            <NameMark label="PDF" />
            Pdf generate
          </button>

          <button className="toolbar-btn suggest-action" onClick={onImprovedAnswer}>
            <NameMark label="IM" />
            Improved
          </button>

          <button className="toolbar-btn insights-action" onClick={onInsights}>
            <NameMark label="IN" />
            Insights
          </button>

          <button className="toolbar-btn ai-action" onClick={onClimbupAi}>
            <ClimbupMark />
            Climbup AI
          </button>

          <div className="toolbar-spacer" />

          <button
            className="toolbar-btn theme-action"
            onClick={onToggleTheme}
            type="button"
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </>
      ) : (
        <>
          <button className="toolbar-btn success-action" onClick={onSave}>
            <NameMark label="SV" />
            {isPublic ? "Save Public" : "Save Private"}
          </button>

          <div className="earning-badge">
            {isPublic ? "Public answer" : "Private answer"}
          </div>

          <button className="toolbar-btn public-action" onClick={onMakePublic}>
            <NameMark label={isPublic ? "PR" : "PB"} />
            {isPublic ? "Make Private" : "Make Public"}
          </button>

          <button className="toolbar-btn secondary-action" onClick={onAddBlock}>
            <NameMark label="ADD" />
            Add Block
          </button>

          <button
            className="toolbar-btn theme-action"
            onClick={onToggleTheme}
            type="button"
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>

          <button className="toolbar-btn danger" onClick={onCancel}>
            Cancel
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
}: Pick<
  AnswerToolbarProps,
  "feedback" | "onShare" | "onLike" | "onDislike"
>) {
  return (
    <div className="answer-feedback-actions">
      <button className="toolbar-btn secondary-action" onClick={onShare}>
        Share
      </button>

      <button
        className={`toolbar-btn icon-action ${
          feedback === "like" ? "active-like" : ""
        }`}
        onClick={onLike}
        title="Like"
      >
        Like
      </button>

      <button
        className={`toolbar-btn icon-action ${
          feedback === "dislike" ? "active-dislike" : ""
        }`}
        onClick={onDislike}
        title="Dislike"
      >
        Dislike
      </button>
    </div>
  );
}
