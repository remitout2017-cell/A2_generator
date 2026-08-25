"use client";

import { useRef, useState } from "react";

export function FileDropZone({
  files,
  onChange,
  inputId,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  inputId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onChange([...files, ...Array.from(e.dataTransfer.files)]);
        }}
        className={`glass-panel block cursor-pointer border-[1.5px]! border-dashed! px-4 py-9 text-center transition-all duration-150 ${
          dragging ? "border-orange! bg-orange/8 scale-[1.005]" : "hover:border-orange! hover:bg-orange/5"
        }`}
      >
        <div className="mx-auto flex items-center justify-center w-11 h-11 rounded-full glass-panel text-lg text-orange">↑</div>
        <p className="mt-3 text-[13px] text-cream">
          <span className="font-semibold">Tap to upload</span> <span className="text-cream-dim">or drag files here</span>
        </p>
        <p className="mt-1 text-[11px] text-cream-dim tracking-[0.04em]">JPG, PNG or PDF</p>
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onChange([...files, ...Array.from(e.target.files)]);
          e.target.value = "";
        }}
      />

      {files.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {files.map((f, i) => (
            <div key={i} className="glass-panel flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs">
              <span className="overflow-hidden text-ellipsis whitespace-nowrap text-cream/90">{f.name}</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                className="shrink-0 bg-transparent border-none text-cream-dim hover:text-orange cursor-pointer font-mono text-sm leading-none transition-colors duration-150"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
