/**
 * Skip-count INPUT (§3) — the child counts by GROUPS. We show `groups` baskets,
 * each holding `per_group` objects. The child taps each basket to skip-count it
 * (basket 1 → 5, basket 2 → 10, …); a cumulative badge appears on each tapped
 * basket and a running total updates. The answer (e.g. 20) is BUILT by skip-
 * counting — it is not a single visible number. Tapping again un-counts.
 *
 * Emitted in Arabic-Indic numerals so the server's string comparison is unchanged.
 */
import { useState } from 'react';
import { toArabicIndic } from '@/lib/numerals';

export interface CountConfig {
  emoji: string;
  groups: number;
  per_group: number;
}

export default function TapCountInput({
  count,
  disabled = false,
  onConfirm,
}: {
  count: CountConfig;
  disabled?: boolean;
  onConfirm: (answer: string) => void;
}) {
  const baskets = Array.from({ length: count.groups }, (_, i) => i);
  const [order, setOrder] = useState<number[]>([]); // tapped basket indices, in order

  const toggle = (g: number) =>
    setOrder((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );

  const total = order.length * count.per_group;

  return (
    <div className="w-full mt-4">
      <div className="flex flex-wrap justify-center gap-4">
        {baskets.map((g) => {
          const pos = order.indexOf(g);
          const counted = pos >= 0;
          const cumulative = (pos + 1) * count.per_group;
          return (
            <button
              key={g}
              type="button"
              disabled={disabled}
              onClick={() => toggle(g)}
              className={`relative rounded-[var(--radius)] p-3 border-4 transition-all active:scale-95 disabled:opacity-60 ${
                counted ? 'border-primary bg-primary/10' : 'border-border bg-card'
              }`}
            >
              {/* the per_group objects inside the basket */}
              <div className="grid grid-cols-3 gap-1 max-w-[120px]">
                {Array.from({ length: count.per_group }, (_, k) => (
                  <span key={k} className="text-2xl" aria-hidden>
                    {count.emoji}
                  </span>
                ))}
              </div>
              {/* cumulative skip-count badge on a counted basket (٥،١٠،١٥،٢٠) */}
              {counted && (
                <span className="absolute -top-3 -right-3 min-w-8 h-8 px-1 rounded-full bg-primary text-primary-foreground text-base font-extrabold flex items-center justify-center shadow">
                  {toArabicIndic(cumulative)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 text-center">
        <p className="text-lg mb-3">
          العدّ: <span className="font-extrabold text-primary text-3xl">{toArabicIndic(total)}</span>
        </p>
        <button
          type="button"
          disabled={disabled || order.length === 0}
          onClick={() => onConfirm(toArabicIndic(total))}
          className="min-h-[56px] rounded-[var(--radius)] bg-primary text-primary-foreground text-xl font-bold px-8 py-3 shadow-md transition-all hover:brightness-95 active:scale-95 disabled:opacity-40"
        >
          تأكيد إجابتي
        </button>
      </div>
    </div>
  );
}
