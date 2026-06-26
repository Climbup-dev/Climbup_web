"use client";

type AddBlockMenuProps = {
  onAdd: (type: string) => void;
};

export default function AddBlockMenu({ onAdd }: AddBlockMenuProps) {
  return (
    <div className="add-block-menu">
      <button onClick={() => onAdd("markdown")}>Text</button>
      <button onClick={() => onAdd("image")}>Image</button>
      <button onClick={() => onAdd("table")}>Table</button>
      <button onClick={() => onAdd("steps")}>Steps</button>
      <button onClick={() => onAdd("code")}>Code</button>
      <button onClick={() => onAdd("mermaid")}>Diagram</button>
    </div>
  );
}
