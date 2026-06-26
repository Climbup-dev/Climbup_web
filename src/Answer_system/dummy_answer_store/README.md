# Dummy Answer Editor Store

This folder is a temporary database replacement for the answer editor.

When an editor save happens in dev mode, the app writes the canonical JSON
snapshot to:

`latest-answer-editor-snapshot.json`

The snapshot keeps the same block shapes that the renderer reads:

- `markdown.content` preserves line breaks.
- `image.url`, `alt`, `caption`, and search metadata stay with the image block.
- `table.columns` and `table.rows` preserve edited cells, including multiline cells.
- `steps.items` preserve every step as structured content.
- `code.content` preserves source code exactly.
- `mermaid.content` stores the Mermaid source code; `MermaidBlock` renders that
  source into the visible diagram on fetch.
