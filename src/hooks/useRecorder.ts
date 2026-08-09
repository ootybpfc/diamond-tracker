import { useState, useRef, useCallback, useEffect } from 'react';

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'transcribing';

/** Hard stop so a forgotten recording can't exceed the serverless body limit. */
export const MAX_RECORDING_SECONDS = 600;

/** Pick the best container the browser actually supports. Safari only does mp4. */
function pickMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

export function isRecordingSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined' &&
    typeof window !== 'undefined' &&
    typeof window.isSecureContext !== 'undefined' &&
    window.isSecureContext
  );
}

interface UseRecorderResult {
  state: RecorderState;
  /** 0–1 live input level, for the waveform. */
  level: number;
  seconds: number;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
  supported: boolean;
  setError: (message: string | null) => void;
  setState: (state: RecorderState) => void;
}

/**
 * Records microphone audio and reports a live input level so the UI can show
 * that it is genuinely listening.
 */
export function useRecorder(onComplete: (blob: Blob, mimeType: string) => void): UseRecorderResult {
  const [state, setState] = useState<RecorderState>('idle');
  const [level, setLevel] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const teardown = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      void audioCtxRef.current.close().catch(() => undefined);
    }
    audioCtxRef.current = null;
    setLevel(0);
  }, []);

  // Never leave the mic open if the component unmounts mid-recording.
  useEffect(() => teardown, [teardown]);

  const start = useCallback(async () => {
    if (!isRecordingSupported()) {
      setError('Recording needs a secure (https) connection and a supported browser.');
      return;
    }

    setError(null);
    setState('requesting');
    cancelledRef.current = false;
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      setState('idle');
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError('Microphone access was blocked. Allow it in your browser settings and try again.');
      } else if (name === 'NotFoundError') {
        setError('No microphone found on this device.');
      } else {
        setError('Could not start the microphone.');
      }
      return;
    }

    streamRef.current = stream;

    // Live level meter, so the button can visibly react to the user's voice.
    try {
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtor();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      ctx.createMediaStreamSource(stream).connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buffer);
        let sumSquares = 0;
        for (let i = 0; i < buffer.length; i++) {
          const deviation = (buffer[i] - 128) / 128;
          sumSquares += deviation * deviation;
        }
        const rms = Math.sqrt(sumSquares / buffer.length);
        // Scale up: normal speech RMS sits well below 0.3.
        setLevel(Math.min(1, rms * 4));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // A missing AudioContext costs us the waveform but not the recording.
    }

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: 32000,
    });
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      teardown();

      if (cancelledRef.current) {
        setState('idle');
        setSeconds(0);
        return;
      }

      if (blob.size < 1200) {
        setState('idle');
        setSeconds(0);
        setError('That recording was too short to hear anything.');
        return;
      }

      setState('transcribing');
      onCompleteRef.current(blob, type);
    };

    recorder.onerror = () => {
      teardown();
      setState('idle');
      setError('Recording failed unexpectedly.');
    };

    setSeconds(0);
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSeconds(elapsed);
      if (elapsed >= MAX_RECORDING_SECONDS && recorderRef.current?.state === 'recording') {
        recorderRef.current.stop();
      }
    }, 1000);

    recorder.start(1000);
    setState('recording');
  }, [teardown]);

  const stop = useCallback(() => {
    cancelledRef.current = false;
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    } else {
      teardown();
      setState('idle');
      setSeconds(0);
    }
  }, [teardown]);

  return {
    state,
    level,
    seconds,
    error,
    start,
    stop,
    cancel,
    supported: isRecordingSupported(),
    setError,
    setState,
  };
}
