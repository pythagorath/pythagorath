/** Western integer -> Arabic-Indic (Hindi) numeral string, e.g. 60 -> "٦٠".
 *  Used so the widget's produced answer matches the stored Hindi `answer`
 *  (server grading stays a plain string compare). */
const HINDI = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicIndic(n: number | string): string {
  return String(n)
    .split('')
    .map((ch) => (ch >= '0' && ch <= '9' ? HINDI[Number(ch)] : ch))
    .join('');
}

/** Arabic-Indic (or mixed) digits -> Western, for parsing numeric inputs. */
export function toWestern(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

/** Normalise any string so every digit is Arabic-Indic (Hindi). */
export function toHindi(s: string): string {
  return toArabicIndic(toWestern(s));
}
