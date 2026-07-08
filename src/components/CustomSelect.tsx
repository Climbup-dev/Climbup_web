"use client";

import { useEffect, useRef, useState } from "react";

export default function CustomSelect({
  label,
  value,
  placeholder,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const selected = options.find((item) => item.value === value);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      className={`profileSelectField ${open ? "isOpen" : ""}`}
      ref={selectRef}
    >
      <span>{label}</span>

      <button
        type="button"
        className={`profileSelectButton ${open ? "isOpen" : ""}`}
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <strong>{selected?.label || placeholder}</strong>
        <em aria-hidden>{open ? "^" : "v"}</em>
      </button>

      {open && !disabled && (
        <div className="profileSelectMenu">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            {placeholder}
          </button>

          {options.map((item) => (
            <button
              type="button"
              key={item.value}
              className={item.value === value ? "selected" : ""}
              onClick={() => {
                onChange(item.value);
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
