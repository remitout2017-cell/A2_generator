import { Fragment } from "react";

const STEPS = ["Sender's ID", "Beneficiary letter", "Review & generate"];

export function Stepper({ activeStep }: { activeStep: 1 | 2 | 3 }) {
  return (
    <div className="mb-9">
      <div className="grid items-center grid-cols-[auto_1fr_auto_1fr_auto]">
        {STEPS.map((_, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          const done = n < activeStep;
          const active = n === activeStep;
          return (
            <Fragment key={n}>
              <div
                style={{ gridColumn: i * 2 + 1 }}
                className={`justify-self-center flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-mono font-semibold transition-all duration-200 ${
                  active
                    ? "bg-orange text-white shadow-[0_0_0_5px_rgba(232,69,10,0.15)]"
                    : done
                      ? "bg-ok text-white"
                      : "glass-panel text-cream-dim"
                }`}
              >
                {done ? "✓" : n}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  style={{ gridColumn: i * 2 + 2 }}
                  className={`h-px mx-1.5 transition-colors duration-300 ${done ? "bg-ok/50" : "bg-line/70"}`}
                />
              )}
            </Fragment>
          );
        })}
      </div>
      <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] mt-2">
        {STEPS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          const done = n < activeStep;
          const active = n === activeStep;
          return (
            <div
              key={label}
              style={{ gridColumn: i * 2 + 1 }}
              className={`text-center text-[10px] tracking-[0.08em] uppercase whitespace-nowrap px-1 ${
                active ? "text-cream" : done ? "text-ok" : "text-cream-dim"
              }`}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
