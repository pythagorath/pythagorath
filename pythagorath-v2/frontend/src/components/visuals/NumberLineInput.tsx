/**
 * Interactive number-line INPUT (§3) — the child taps a position on the line to
 * place a marker; the answer is PRODUCED from that placement (not from choice
 * buttons). Tap-only for now (drag is a later enhancement).
 *
 * Internally the values are Western ints (for layout/maths); the produced answer
 * is emitted in Arabic-Indic (Hindi) numerals so it matches the stored answer —
 * the server's string comparison is left unchanged.
 */
import { useState } from 'react';
import { toArabicIndic } from '@/lib/numerals';

export interface LineConfig {
  min: number;
  max: number;
  step: number;
}

export default function NumberLineInput({
  line,
  disabled = false,
  onConfirm,
}: {
  line: LineConfig;
  disabled?: boolean;
  onConfirm: (answer: string) => void;
}) {
  const values: number[] = [];
  for (let v = line.min; v <= line.max; v += line.step) values.push(v);

  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="w-full mt-4">
      {/* The line is LTR (0 on the left, increasing right) inside the RTL page. */}
      <div dir="ltr" className="overflow-x-auto pb-2">
        <div className="flex items-end justify-center gap-1 min-w-fit mx-auto px-2">
          {values.map((v) => {
            const isSel = v === selected;
            return (
              <button
                key={v}
                type="button"
                disabled={disabled}
                onClick={() => setSelected(v)}
                className="flex flex-col items-center min-w-[44px] disabled:opacity-60"
              >
                {/* marker pin above the selected tick */}
                <span className={`text-2xl h-8 ${isSel ? '' : 'opacity-0'}`} aria-hidden>
                  📍
                </span>
                <span className={`w-1 h-5 ${isSel ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                <span
                  className={`mt-1 text-lg font-bold w-9 h-9 flex items-center justify-center rounded-full ${
                    isSel ? 'bg-primary text-primary-foreground' : 'text-foreground'
                  }`}
                >
                  {toArabicIndic(v)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-lg mb-3 min-h-[28px]">
          {selected !== null ? (
            <>اخترت: <span className="font-extrabold text-primary text-2xl">{toArabicIndic(selected)}</span></>
          ) : (
            <span className="text-muted-foreground">انقر على الموضع الصحيح</span>
          )}
        </p>
        <button
          type="button"
          disabled={disabled || selected === null}
          onClick={() => selected !== null && onConfirm(toArabicIndic(selected))}
          className="min-h-[56px] rounded-[var(--radius)] bg-primary text-primary-foreground text-xl font-bold px-8 py-3 shadow-md transition-all hover:brightness-95 active:scale-95 disabled:opacity-40"
        >
          تأكيد إجابتي
        </button>
      </div>
    </div>
  );
}
