"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useRef, useState } from "react";
import RichTextEditor from "./RichTextEditor";

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
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deleteImageFromCloudinary = async (url: string) => {
    if (!url.includes('cloudinary.com')) return; // Only delete Cloudinary images
    
    setIsDeleting(true);
    try {
      await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
    } catch (error) {
      console.error('Failed to delete old image:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      
      // If there was an old image, delete it from Cloudinary to save space
      if (block.url) {
        deleteImageFromCloudinary(block.url);
      }
      
      updateField("url", data.url);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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

        <button 
          className="delete-block-btn" 
          disabled={isDeleting}
          onClick={() => {
            if (type === "image" && block.url) {
              deleteImageFromCloudinary(block.url);
            }
            onDelete(index);
          }}
          title="Delete Block"
        >
          {isDeleting ? "..." : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          )}
        </button>
      </div>

      {type === "markdown" && (
        <RichTextEditor
          className="inline-content-textarea"
          value={block.content || ""}
          onChange={(value) => updateField("content", value)}
          placeholder="Write content..."
        />
      )}

      {type === "image" && (
        <>
          {block.url ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <img 
                src={block.url} 
                alt="Uploaded block" 
                style={{ width: '100%', borderRadius: '8px', border: '1px solid rgba(158, 248, 220, 0.2)', objectFit: 'contain', maxHeight: '400px', backgroundColor: 'rgba(2, 21, 38, 0.4)' }} 
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="toolbar-btn primary"
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px' }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : "Replace Image"}
                </button>
                <button
                  type="button"
                  className="toolbar-btn danger"
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px' }}
                  disabled={isDeleting}
                  onClick={() => {
                    if (block.url) deleteImageFromCloudinary(block.url);
                    updateField("url", "");
                  }}
                >
                  {isDeleting ? "Removing..." : "Remove Image"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button
                  type="button"
                  className="toolbar-btn primary"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px' }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                      Upload Image (Camera/Gallery)
                    </>
                  )}
                </button>
              </div>
              <div style={{ textAlign: 'center', margin: '4px 0 8px', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>OR</div>
              <input
                className="inline-input"
                value={block.url || ""}
                onChange={(e) => updateField("url", e.target.value)}
                placeholder="Image URL"
              />
            </>
          )}

          <input
            className="inline-input"
            style={{ marginTop: '8px' }}
            value={block.search_query || ""}
            onChange={(e) => updateField("search_query", e.target.value)}
            placeholder="Search query (Optional)"
          />
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImageUpload}
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
                    <RichTextEditor
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

          <RichTextEditor
            className="inline-content-textarea"
            value={
              typeof item === "string"
                ? item
                : item.content || item.text || item.description || ""
            }
            onChange={(value) => updateStep(stepIndex, value)}
          />
        </div>
      ))}
    </div>
  );
}
