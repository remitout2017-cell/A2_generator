export interface Status {
  kind: "idle" | "loading" | "ok" | "err";
  message: string;
}

export const IDLE_STATUS: Status = { kind: "idle", message: "" };

export function StatusMessage({ status }: { status: Status }) {
  const color = status.kind === "err" ? "text-[#e08a6f]" : status.kind === "ok" ? "text-ok" : "text-cream-dim";
  return (
    <div className={`text-xs mt-2.5 min-h-4 ${color}`}>
      {status.kind === "loading" && <span className="spinner" />}
      {status.message}
    </div>
  );
}
