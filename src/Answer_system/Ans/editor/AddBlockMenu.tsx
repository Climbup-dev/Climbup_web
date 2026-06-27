"use client";

import type { ReactNode } from "react";

type AddBlockMenuProps = {
  onAdd: (type: string) => void;
};

type BlockToolIcon = "text" | "image" | "table" | "steps" | "code" | "diagram";

const blockTools = [
  { type: "markdown", label: "Text", icon: "text" },
  { type: "image", label: "Image", icon: "image" },
  { type: "table", label: "Table", icon: "table" },
  { type: "steps", label: "Steps", icon: "steps" },
  { type: "code", label: "Code", icon: "code" },
  { type: "mermaid", label: "Diagram", icon: "diagram" },
] satisfies Array<{ type: string; label: string; icon: BlockToolIcon }>;

const IconSvg = ({ children }: { children: ReactNode }) => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
  >
    {children}
  </svg>
);

const blockIcons: Record<BlockToolIcon, ReactNode> = {
  text: (
    <IconSvg>
      <path d="M5 5h14" />
      <path d="M12 5v14" />
      <path d="M8 19h8" />
    </IconSvg>
  ),
  image: (
    <IconSvg>
      <rect height="15" rx="3" width="18" x="3" y="5" />
      <path d="M7 15l3-3 3 3 2-2 3 4" />
      <circle cx="16" cy="9" r="1.4" />
    </IconSvg>
  ),
  table: (
    <IconSvg>
      <rect height="16" rx="3" width="16" x="4" y="4" />
      <path d="M4 10h16" />
      <path d="M10 4v16" />
      <path d="M16 4v16" />
    </IconSvg>
  ),
  steps: (
    <IconSvg>
      <path d="M7 7h12" />
      <path d="M7 12h12" />
      <path d="M7 17h12" />
      <path d="M4 7h.1" />
      <path d="M4 12h.1" />
      <path d="M4 17h.1" />
    </IconSvg>
  ),
  code: (
    <IconSvg>
      <path d="M8 8l-4 4 4 4" />
      <path d="M16 8l4 4-4 4" />
      <path d="M13 5l-2 14" />
    </IconSvg>
  ),
  diagram: (
    <IconSvg>
      <rect height="6" rx="2" width="6" x="4" y="4" />
      <rect height="6" rx="2" width="6" x="14" y="14" />
      <path d="M10 7h3a4 4 0 0 1 4 4v3" />
      <path d="M14 17h-3a4 4 0 0 1-4-4v-3" />
    </IconSvg>
  ),
};

export default function AddBlockMenu({ onAdd }: AddBlockMenuProps) {
  return (
    <div className="add-block-menu">
      {blockTools.map((tool) => (
        <button
          aria-label={tool.label}
          className="block-tool"
          data-tooltip={tool.label}
          key={tool.type}
          onClick={() => onAdd(tool.type)}
          type="button"
        >
          <span className="block-tool-icon" data-kind={tool.icon} aria-hidden>
            {blockIcons[tool.icon]}
          </span>
          <span className="block-tool-label">{tool.label}</span>
        </button>
      ))}
    </div>
  );
}
