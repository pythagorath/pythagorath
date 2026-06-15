/**
 * Play a question's recorded audio (teacher's voice). Safe fallback: if there is
 * no recording (404) the temporary SpeechSynthesis reads the prompt instead.
 */
import { questionAudioUrl } from '@/api/client';
import { speak } from '@/lib/speak';

let current: HTMLAudioElement | null = null;

export function playQuestionAudio(questionId: number, fallbackText?: string): void {
  try {
    current?.pause();
  } catch {
    /* ignore */
  }
  const audio = new Audio(questionAudioUrl(questionId));
  current = audio;
  // 'error' fires when there is no recording (404/missing) -> fall back to TTS.
  audio.addEventListener('error', () => {
    if (fallbackText) speak(fallbackText);
  });
  // play() may also reject due to autoplay policy (no user gesture); that's fine —
  // the recording exists and the child can tap the 🔊 button to hear it.
  audio.play().catch(() => {
    /* autoplay blocked; no fallback here (handled by 'error' for the 404 case) */
  });
}
