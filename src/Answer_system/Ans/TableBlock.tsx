"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { renderMarkdown } from "./MarkdownBlock";

export default function TableBlock({ block }: { block: any }) {
  const title = block?.title || "Table";
  const columns = Array.isArray(block?.columns) ? block.columns : [];
  const rows = Array.isArray(block?.rows) ? block.rows : [];

  return (
    <div className="block table-block">
      <h2 className="block-title">{title}</h2>

      <div className="table-scroll">
        <table className="answer-table">
          <thead>
            <tr>
              {columns.map((col: any, index: number) => (
                <th key={index}>{col}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row: any, rowIndex: number) => (
              <tr key={rowIndex}>
                {columns.map((_: any, colIndex: number) => (
                  <td key={colIndex}>
                    {Array.isArray(row)
                      ? renderMarkdown(String(row[colIndex] || ""))
                      : ""}
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
