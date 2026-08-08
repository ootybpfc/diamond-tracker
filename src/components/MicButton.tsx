import { Mic, MicOff } from 'lucide-react';
import { useMic } from '../hooks/useMic';
import { useState, useCallback } from 'react';

interface MicButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export function MicButton({ onTranscript, className = '' }: MicButtonProps) {
  const [localText, setLocalText] = useState('');
  const handleTranscript = useCallback((text: string) => {
    setLocalText(text);
    onTranscript(text);
  }, [onTranscript]);

  const { isListening, start, stop, supported } = useMic(handleTranscript);

  if (!supported) {
    return (
      <button
        disabled
        title="Voice input not supported in this browser. Use Chrome on desktop or Android."
        className={`inline-flex items-center justify-center w-10 h-10 rounded-pill bg-surface-2 border border-border text-muted opacity-50 cursor-not-allowed ${className}`}
      >
        <MicOff size={18} />
      </button>
    );
  }

  return (
    <button
      onClick={() => (isListening ? stop() : start())}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-pill transition-all duration-150 active:scale-90 ${
        isListening
          ? 'bg-danger/20 text-danger border border-danger/40 animate-pulse-subtle'
          : 'bg-surface-2 text-accent border border-border hover:border-accent/50'
      } ${className}`}
      title={isListening ? 'Stop recording' : 'Start voice input'}
    >
      <Mic size={18} strokeWidth={2.5} />
    </button>
  );
}
