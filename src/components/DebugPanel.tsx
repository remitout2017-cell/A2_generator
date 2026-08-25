export function DebugPanel({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return null;
  return (
    <pre
      className={`mt-2.5 rounded-md border border-line bg-[#0c1015] p-2.5 text-[10px] text-[#99ddbb] whitespace-pre-wrap max-h-40 overflow-auto ${className}`}
    >
      {text}
    </pre>
  );
}
