/**
 * Fill INPUT (§3) — the child types a number on an ON-SCREEN Arabic-Indic keypad
 * (no system keyboard: clearer for a child and guarantees Hindi numerals). The
 * digit buttons emit Hindi glyphs directly, so the produced answer already
 * matches the stored Hindi answer — the server's string comparison is unchanged.
 */
import { useState } from 'react';

export interface FillConfig {
  max_digits?: number;
}

const KEYS = ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export default function FillInput({
  config,
  disabled = false,
  onConfirm,
}: {
  config?: FillConfig;
  disabled?: boolean;
  onConfirm: (answer: string) => void;
}) {
  const max = config?.max_digits ?? 3;
  const [value, setValue] = useState('');

  const press = (d: string) =>
    setValue((v) => (v.length < max ? v + d : v));
  const backspace = () => setValue((v) => v.slice(0, -1));

  const key =
    'h-16 rounded-xl bg-card border-2 border-primary/30 text-3xl font-extrabold ' +
    'text-foreground shadow-sm transition-all active:scale-90 disabled:opacity-60';

  return (
    <div className="w-full mt-4 max-w-xs mx-auto">
      {/* display field */}
      <div className="h-16 mb-4 rounded-[var(--radius)] border-2 border-border bg-secondary/40 flex items-center justify-center">
        {value ? (
          <span className="text-4xl font-extrabold text-primary tracking-widest">{value}</span>
        ) : (
          <span className="text-muted-foreground text-lg">اكتب إجابتك</span>
        )}
      </div>

      {/* on-screen Hindi keypad */}
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((d) => (
          <button key={d} type="button" disabled={disabled} onClick={() => press(d)} className={key}>
            {d}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled || value === ''}
          onClick={backspace}
          className={key + ' text-2xl'}
          aria-label="مسح"
        >
          ⌫
        </button>
        <button key="zero" type="button" disabled={disabled} onClick={() => press('٠')} className={key}>
          ٠
        </button>
        <span />
      </div>

      <div className="mt-5 text-center">
        <button
          type="button"
          disabled={disabled || value === ''}
          onClick={() => onConfirm(value)}
          className="min-h-[56px] w-full rounded-[var(--radius)] bg-primary text-primary-foreground text-xl font-bold px-8 py-3 shadow-md transition-all hover:brightness-95 active:scale-95 disabled:opacity-40"
        >
          تأكيد إجابتي
        </button>
      </div>
    </div>
  );
}
