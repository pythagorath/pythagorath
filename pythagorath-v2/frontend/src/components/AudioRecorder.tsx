/**
 * Reusable inline audio recorder for one question — record / listen / save /
 * delete. Uses the existing audio API. Embedded in the question form so authoring
 * and recording happen in one place.
 */
import { useEffect, useRef, useState } from 'react';
import { questionAudioUrl, uploadQuestionAudio, deleteQuestionAudio } from '@/api/client';

export default function AudioRecorder({
  questionId,
  hasAudio,
  onChange,
}: {
  questionId: number;
  hasAudio?: boolean;
  onChange?: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(!!hasAudio);
  const [status, setStatus] = useState('');
  const [cacheBust, setCacheBust] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    setSaved(!!hasAudio);
    setClipUrl(null);
    blobRef.current = null;
    setStatus('');
  }, [questionId, hasAudio]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        blobRef.current = new Blob(chunksRef.current, { type: 'audio/webm' });
        setClipUrl(URL.createObjectURL(blobRef.current));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setStatus('…جارٍ التسجيل');
    } catch {
      setStatus('تعذّر الوصول إلى الميكروفون');
    }
  }
  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
    setStatus('استمع ثم احفظ');
  }
  async function save() {
    if (!blobRef.current) return;
    await uploadQuestionAudio(questionId, blobRef.current);
    setClipUrl(null);
    blobRef.current = null;
    setSaved(true);
    setCacheBust((c) => c + 1);
    setStatus('✅ حُفظ الصوت');
    onChange?.();
  }
  async function remove() {
    try {
      await deleteQuestionAudio(questionId);
      setSaved(false);
      setStatus('🗑 حُذف الصوت');
      onChange?.();
    } catch {
      setStatus('لا يوجد صوت محفوظ');
    }
  }

  return (
    <div className="rounded-[var(--radius)] border border-border p-3 bg-secondary/30">
      <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
        🎙 صوت السؤال {saved ? <span className="text-emerald-600">✓ مسجَّل</span> : <span className="text-muted-foreground">○ غير مسجَّل</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <button type="button" onClick={start} className="min-h-[40px] rounded-lg bg-primary text-primary-foreground font-bold px-4 active:scale-95">🎙 تسجيل</button>
        ) : (
          <button type="button" onClick={stop} className="min-h-[40px] rounded-lg bg-destructive text-destructive-foreground font-bold px-4 active:scale-95">⏹ إيقاف</button>
        )}
        {clipUrl && (
          <>
            <audio src={clipUrl} controls className="h-9" />
            <button type="button" onClick={save} className="min-h-[40px] rounded-lg bg-primary text-primary-foreground font-bold px-4 active:scale-95">حفظ</button>
            <button type="button" onClick={() => { setClipUrl(null); blobRef.current = null; }} className="min-h-[40px] rounded-lg border border-border px-4">إعادة</button>
          </>
        )}
        {saved && !clipUrl && (
          <>
            <audio key={cacheBust} src={`${questionAudioUrl(questionId)}?v=${cacheBust}`} controls className="h-9" />
            <button type="button" onClick={remove} className="text-sm text-destructive font-medium px-2">حذف</button>
          </>
        )}
        {status && <span className="text-sm text-primary font-medium">{status}</span>}
      </div>
    </div>
  );
}
