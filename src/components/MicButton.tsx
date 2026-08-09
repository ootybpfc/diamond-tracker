import { Mic, MicOff, X, Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useRecorder, MAX_RECORDING_SECONDS } from '../hooks/useRecorder';
import { transcribeAudio } from '../lib/ai';
import { loadSettings } from '../lib/settings';

interface MicButtonProps {
  /** Receives the transcript. Append rather than replace is handled by the caller. */
  onTranscript: (text: string) => void;
  className?: string;
}

function formatTime(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function MicButton({ onTranscript, className = '' }: MicButtonProps) {
  const [failed, setFailed] = useState<string | null>(null);

  const handleComplete = useCallback(
    async (blob: Blob, mimeType: string) => {
      setFailed(null);
      const settings = loadSettings();
      const result = await transcribeAudio(blob, mimeType, {
        language: settings.transcriptionLanguage,
        context: settings.vocabulary,
      });

      if (result.error) {
        setFailed(result.error);
      } else if (!result.text) {
        setFailed("Couldn't hear any speech in that recording.");
      } else {
        onTranscript(result.text);
      }
      setState('idle');
    },
    [onTranscript]
  );

  const { state, level, seconds, error, start, stop, cancel, supported, setState, setError } =
    useRecorder(handleComplete);

  const message = failed || error;

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        title="Voice input needs a secure connection and microphone support."
        className={`inline-flex items-center justify-center w-10 h-10 rounded-pill bg-surface-2 border border-border text-muted opacity-50 cursor-not-allowed ${className}`}
        data-testid="button-mic-unsupported"
      >
        <MicOff size={18} />
      </button>
    );
  }

  const isRecording = state === 'recording';
  const isBusy = state === 'transcribing' || state === 'requesting';
  const nearLimit = seconds >= MAX_RECORDING_SECONDS - 30;

  return (
    <div className={`flex flex-col items-stretch gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setFailed(null);
            setError(null);
            if (isRecording) stop();
            else if (!isBusy) void start();
          }}
          disabled={isBusy}
          aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
          aria-pressed={isRecording}
          className={`relative inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-pill transition-colors duration-150 active:scale-90 ${
            isRecording
              ? 'bg-danger text-white border border-danger'
              : isBusy
                ? 'bg-surface-2 text-muted border border-border cursor-wait'
                : 'bg-surface-2 text-accent border border-border hover:border-accent/50'
          }`}
          data-testid="button-mic"
        >
          {/* Halo that grows with the user's voice — unmistakable proof it's listening. */}
          {isRecording && (
            <span
              aria-hidden
              className="absolute inset-0 rounded-pill bg-danger/40"
              style={{
                transform: `scale(${1 + level * 0.9})`,
                opacity: 0.25 + level * 0.5,
                transition: 'transform 90ms linear, opacity 90ms linear',
              }}
            />
          )}
          {isRecording && (
            <span aria-hidden className="absolute inset-0 rounded-pill border-2 border-danger animate-ping" />
          )}
          <span className="relative">
            {state === 'transcribing' || state === 'requesting' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Mic size={18} strokeWidth={2.5} />
            )}
          </span>
        </button>

        {isRecording && (
          <div className="flex items-center gap-2 flex-1 min-w-0" data-testid="recording-indicator">
            <span className="w-2 h-2 rounded-pill bg-danger animate-pulse shrink-0" />
            <span className={`font-mono text-sm tabular-nums shrink-0 ${nearLimit ? 'text-danger' : 'text-text'}`}>
              {formatTime(seconds)}
            </span>
            {/* Live bars driven by actual mic input. */}
            <div className="flex items-end gap-[3px] h-6 flex-1 min-w-0 overflow-hidden">
              {Array.from({ length: 14 }).map((_, i) => {
                const wave = Math.sin((i / 13) * Math.PI);
                const height = Math.max(4, Math.min(24, 4 + level * 30 * (0.45 + wave * 0.55)));
                return (
                  <span
                    key={i}
                    className="w-[3px] rounded-pill bg-danger/80"
                    style={{ height: `${height}px`, transition: 'height 90ms linear' }}
                  />
                );
              })}
            </div>
            <button
              type="button"
              onClick={cancel}
              aria-label="Discard recording"
              className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-pill text-muted hover:text-danger transition-colors"
              data-testid="button-mic-cancel"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {state === 'transcribing' && (
          <span className="text-sm text-muted" data-testid="text-transcribing">
            Transcribing...
          </span>
        )}
        {state === 'requesting' && <span className="text-sm text-muted">Starting mic...</span>}
      </div>

      {isRecording && nearLimit && (
        <p className="text-xs text-danger">
          Approaching the {Math.round(MAX_RECORDING_SECONDS / 60)}-minute limit — recording stops automatically.
        </p>
      )}

      {message && (
        <p className="text-xs text-danger" data-testid="text-mic-error">
          {message}
        </p>
      )}
    </div>
  );
}
