/**
 * Spoken instructions for early readers (§3.2) — TEMPORARY implementation using
 * the browser's built-in Arabic speech synthesis (zero assets). The production
 * build may later swap to professionally recorded audio befitting Pythagorath.
 */
export function speak(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* speech is a non-critical enhancement */
  }
}
