"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useRef, useState } from "react";

type BlockEditorProps = {
  block: any;
  index: number;
  onChange: (index: number, block: any) => void;
  onDelete: (index: number) => void;
};

type NestedEditorProps = Omit<BlockEditorProps, "onDelete">;

export default function BlockEditor({
  block,
  index,
  onChange,
  onDelete,
}: BlockEditorProps) {
  const type = block?.type || "markdown";

  const updateField = (field: string, value: any) => {
    onChange(index, {
      ...block,
      [field]: value,
    });
  };

  return (
    <div className="block block-editor-card">
      <div className="editor-card-top">
        <span className="block-type-pill">{type.toUpperCase()}</span>

        <button className="delete-block-btn" onClick={() => onDelete(index)}>
          Delete
        </button>
      </div>

      <input
        className="inline-title-input"
        value={block.title || ""}
        onChange={(e) => updateField("title", e.target.value)}
        placeholder="Block title"
      />

      {type === "markdown" && (
        <InlineFormatTextarea
          className="inline-content-textarea"
          value={block.content || ""}
          onChange={(value) => updateField("content", value)}
          placeholder="Write content..."
          rows={8}
        />
      )}

      {type === "image" && (
        <>
          <input
            className="inline-input"
            value={block.url || ""}
            onChange={(e) => updateField("url", e.target.value)}
            placeholder="Image URL"
          />

          <input
            className="inline-input"
            value={block.search_query || ""}
            onChange={(e) => updateField("search_query", e.target.value)}
            placeholder="Search query"
          />
        </>
      )}

      {type === "table" && (
        <TableEditor block={block} index={index} onChange={onChange} />
      )}

      {type === "steps" && (
        <StepsEditor block={block} index={index} onChange={onChange} />
      )}

      {type === "code" && (
        <>
          <input
            className="inline-input"
            value={block.language || ""}
            onChange={(e) => updateField("language", e.target.value)}
            placeholder="Language"
          />

          <textarea
            data-format-textarea="true"
            className="inline-content-textarea code-editor-area"
            value={block.content || ""}
            onChange={(e) => updateField("content", e.target.value)}
            placeholder="Write code..."
            rows={10}
          />
        </>
      )}

      {type === "mermaid" && (
        <textarea
          data-format-textarea="true"
          className="inline-content-textarea code-editor-area"
          value={block.content || ""}
          onChange={(e) => updateField("content", e.target.value)}
          placeholder="Write Mermaid diagram code..."
          rows={8}
        />
      )}
    </div>
  );
}

function InlineFormatTextarea({
  value,
  onChange,
  className,
  placeholder,
  rows,
}: {
  value: string;
  onChange: (value: string) => void;
  className: string;
  placeholder?: string;
  rows?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const [toolbar, setToolbar] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });

  const syncToolbar = () => {
    const textarea = textareaRef.current;
    if (!textarea || textarea.selectionStart === textarea.selectionEnd) {
      setToolbar((prev) => ({ ...prev, visible: false }));
      return;
    }

    const rect = textarea.getBoundingClientRect();
    const pointer = lastPointerRef.current;

    setToolbar({
      visible: true,
      x: Math.min(
        window.innerWidth - 220,
        Math.max(12, pointer?.x ?? rect.left + rect.width / 2)
      ),
      y: Math.max(12, (pointer?.y ?? rect.top) - 48),
    });
  };

  const applyFormat = (format: "bold" | "highlight" | "code" | "h2" | "bullet") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    if (!selected) return;

    const formatted = formatSelection(selected, format);
    const nextValue = `${value.slice(0, start)}${formatted}${value.slice(end)}`;
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + formatted.length);
      syncToolbar();
    });
  };

  return (
    <div className="inline-format-textarea-wrap">
      <textarea
        ref={textareaRef}
        className={className}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onMouseDown={(event) => {
          lastPointerRef.current = { x: event.clientX, y: event.clientY };
        }}
        onMouseUp={(event) => {
          lastPointerRef.current = { x: event.clientX, y: event.clientY };
          syncToolbar();
        }}
        onKeyUp={syncToolbar}
        onSelect={syncToolbar}
        onBlur={() => {
          window.setTimeout(() => {
            if (document.activeElement?.closest(".selection-format-toolbar")) {
              return;
            }

            setToolbar((prev) => ({ ...prev, visible: false }));
          }, 120);
        }}
        placeholder={placeholder}
        rows={rows}
      />

      {toolbar.visible && (
        <div
          className="selection-format-toolbar"
          style={{ left: toolbar.x, top: toolbar.y }}
          role="toolbar"
          aria-label="Text formatting"
        >
          <button
            type="button"
            title="Bold"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyFormat("bold")}
          >
            B
          </button>
          <button
            type="button"
            className="format-highlight-btn"
            title="Highlight"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyFormat("highlight")}
          >
            HL
          </button>
          <button
            type="button"
            title="Inline code"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyFormat("code")}
          >
            Code
          </button>
          <button
            type="button"
            title="Heading"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyFormat("h2")}
          >
            H2
          </button>
          <button
            type="button"
            title="Bullet"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyFormat("bullet")}
          >
            List
          </button>
        </div>
      )}
    </div>
  );
}

function formatSelection(
  selectedText: string,
  format: "bold" | "highlight" | "code" | "h2" | "bullet"
) {
  const text = selectedText.trim();
  const leading = selectedText.match(/^\s*/)?.[0] || "";
  const trailing = selectedText.match(/\s*$/)?.[0] || "";

  switch (format) {
    case "bold":
      return `${leading}**${text}**${trailing}`;
    case "highlight":
      return `${leading}==${text}==${trailing}`;
    case "code":
      return `${leading}\`${text.replace(/`/g, "'")}\`${trailing}`;
    case "h2":
      return selectedText
        .split(/\r?\n/)
        .map((line) => (line.trim() ? `## ${line.replace(/^#+\s*/, "")}` : line))
        .join("\n");
    case "bullet":
      return selectedText
        .split(/\r?\n/)
        .map((line) => (line.trim() ? `- ${line.replace(/^[-*]\s+/, "")}` : line))
        .join("\n");
    default:
      return selectedText;
  }
}

function TableEditor({ block, index, onChange }: NestedEditorProps) {
  const columns = Array.isArray(block.columns) ? block.columns : [];
  const rows = Array.isArray(block.rows) ? block.rows : [];

  const updateTable = (newColumns: any[], newRows: any[]) => {
    onChange(index, {
      ...block,
      columns: newColumns,
      rows: newRows,
    });
  };

  const updateColumn = (colIndex: number, value: string) => {
    const newColumns = [...columns];
    newColumns[colIndex] = value;
    updateTable(newColumns, rows);
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = rows.map((row: any[]) => [...row]);
    newRows[rowIndex][colIndex] = value;
    updateTable(columns, newRows);
  };

  const addColumn = () => {
    updateTable(
      [...columns, "New Column"],
      rows.map((row: any[]) => [...row, ""])
    );
  };

  const addRow = () => {
    updateTable(columns, [...rows, columns.map(() => "")]);
  };

  return (
    <div className="inline-table-editor">
      <div className="editor-actions">
        <button type="button" onClick={addColumn}>
          + Column
        </button>
        <button type="button" onClick={addRow}>
          + Row
        </button>
      </div>

      <div className="table-scroll">
        <table className="answer-table">
          <thead>
            <tr>
              {columns.map((col: string, colIndex: number) => (
                <th key={colIndex}>
                  <input
                    className="table-cell-input"
                    value={col}
                    onChange={(e) => updateColumn(colIndex, e.target.value)}
                  />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row: any[], rowIndex: number) => (
              <tr key={rowIndex}>
                {columns.map((_: string, colIndex: number) => (
                  <td key={colIndex}>
                    <InlineFormatTextarea
                      className="table-cell-textarea"
                      value={row[colIndex] || ""}
                      onChange={(value) => updateCell(rowIndex, colIndex, value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StepsEditor({ block, index, onChange }: NestedEditorProps) {
  const items = Array.isArray(block.items) ? block.items : [];

  const updateSteps = (newItems: any[]) => {
    onChange(index, {
      ...block,
      items: newItems,
    });
  };

  const updateStep = (stepIndex: number, value: string) => {
    const newItems = [...items];

    if (typeof newItems[stepIndex] === "string") {
      newItems[stepIndex] = value;
    } else {
      newItems[stepIndex] = {
        ...newItems[stepIndex],
        content: value,
      };
    }

    updateSteps(newItems);
  };

  const addStep = () => {
    updateSteps([...items, { content: "New step" }]);
  };

  return (
    <div className="inline-steps-editor">
      <div className="editor-actions">
        <button type="button" onClick={addStep}>
          + Step
        </button>
      </div>

      {items.map((item: any, stepIndex: number) => (
        <div className="step-edit-row" key={stepIndex}>
          <div className="step-edit-number">{stepIndex + 1}</div>

          <InlineFormatTextarea
            className="inline-content-textarea"
            value={
              typeof item === "string"
                ? item
                : item.content || item.text || item.description || ""
            }
            onChange={(value) => updateStep(stepIndex, value)}
            rows={3}
          />
        </div>
      ))}
    </div>
  );
}
