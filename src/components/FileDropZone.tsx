"use client";

import { useEffect, useRef, useState } from "react";

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
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!previewFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(previewFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [previewFile]);

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
              <button
                type="button"
                className="overflow-hidden text-ellipsis whitespace-nowrap text-cream/90 bg-transparent border-none p-0 cursor-pointer text-left hover:text-orange hover:underline transition-colors duration-150"
                onClick={() => setPreviewFile(f)}
                title={`Preview ${f.name}`}
              >
                {f.name}
              </button>
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

      {previewFile && previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="glass-card relative w-full max-w-3xl max-h-[85vh] flex flex-col p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-[13px] text-cream/90 overflow-hidden text-ellipsis whitespace-nowrap">{previewFile.name}</span>
              <button
                type="button"
                aria-label="Close preview"
                className="shrink-0 bg-transparent border-none text-cream-dim hover:text-orange cursor-pointer font-mono text-base leading-none transition-colors duration-150"
                onClick={() => setPreviewFile(null)}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center">
              {previewFile.type === "application/pdf" ? (
                <iframe src={previewUrl} title={previewFile.name} className="w-full h-[75vh] border-none rounded" />
              ) : previewFile.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt={previewFile.name} className="max-w-full max-h-[75vh] object-contain rounded" />
              ) : (
                <p className="text-cream-dim text-xs">Preview not available for this file type.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
