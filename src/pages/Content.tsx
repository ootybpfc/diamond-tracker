import { useState, useCallback } from 'react';
import { BookOpen, Mic, Share2, Loader2, RefreshCw, Clock, Book, Headphones, Trash2, AlertCircle } from 'lucide-react';
import { useData } from '../hooks/useData';
import { useToast } from '../components/ui/Toast';
import { Card, SectionHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { MicButton } from '../components/MicButton';
import { appendTranscript } from '../lib/utils';
import { polishContent, AIStatus } from '../lib/ai';
import { ContentType, ContentEntry } from '../types/database';
import { today, relativeTime } from '../lib/utils';

// Persistent per-entry AI status
type EntryAIStatus = AIStatus;

export function Content() {
  const { contentEntries, addContent, updateContentPolished, deleteContent } = useData();
  const toast = useToast();

  const [text, setText] = useState('');
  const [type, setType] = useState<ContentType>('reading');
  const [saving, setSaving] = useState(false);
  // Map of entry ID -> AI status (persists across renders, doesn't auto-clear)
  const [entryStatuses, setEntryStatuses] = useState<Map<string, EntryAIStatus>>(new Map());
  const [activeTab, setActiveTab] = useState<ContentType>('reading');

  const setEntryStatus = useCallback((id: string, status: EntryAIStatus) => {
    setEntryStatuses((prev) => new Map(prev).set(id, status));
  }, []);

  const handleSaveAndPolish = async () => {
    if (!text.trim()) return;
    setSaving(true);

    const isOnline = navigator.onLine;

    // Save raw entry immediately (Supabase requires online)
    if (!isOnline) {
      toast('Cannot save while offline — please reconnect to log content', 'error');
      setSaving(false);
      return;
    }

    const entryId = await addContent(type, today(), text.trim());
    setSaving(false);

    if (!entryId) {
      toast('Failed to save entry', 'error');
      return;
    }

    setText('');
    toast('Saved — polishing...', 'success');

    // Polish via AI
    setEntryStatus(entryId, 'loading');

    const result = await polishContent(text.trim(), type, {
      contentEntryId: entryId,
      onQueue: () => {
        setEntryStatus(entryId, 'queued');
        toast('Polish queued — will retry when online', 'info');
      },
    });

    if (result.status === 'done' && result.polished) {
      await updateContentPolished(entryId, result.polished);
      setEntryStatus(entryId, 'done');
      toast('Polished and ready to share', 'success');
    } else if (result.status === 'cached' && result.polished) {
      await updateContentPolished(entryId, result.polished);
      setEntryStatus(entryId, 'cached');
      toast('Showing cached polished version', 'info');
    } else if (result.status === 'queued') {
      setEntryStatus(entryId, 'queued');
    } else {
      setEntryStatus(entryId, 'error');
      toast('Polish failed — tap retry', 'error');
    }
  };

  const handleRetryPolish = async (entry: ContentEntry) => {
    setEntryStatus(entry.id, 'loading');

    const result = await polishContent(entry.raw_text, entry.type, {
      contentEntryId: entry.id,
    });

    if (result.status === 'done' && result.polished) {
      await updateContentPolished(entry.id, result.polished);
      setEntryStatus(entry.id, 'done');
      toast('Polished successfully', 'success');
    } else if (result.status === 'cached' && result.polished) {
      await updateContentPolished(entry.id, result.polished);
      setEntryStatus(entry.id, 'cached');
      toast('Showing cached version', 'info');
    } else if (result.status === 'queued') {
      setEntryStatus(entry.id, 'queued');
    } else {
      setEntryStatus(entry.id, 'error');
      toast('Still failing — try again later', 'error');
    }
  };

  const shareToWhatsApp = (polished: string) => {
    const encoded = encodeURIComponent(polished);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const filteredEntries = contentEntries.filter((c) => c.type === activeTab);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5 safe-top">
      <div>
        <h1 className="font-display font-bold text-xl text-text">Content</h1>
        <p className="text-muted text-sm">Log and polish your reading & podcasts</p>
      </div>

      {/* Input card */}
      <Card>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setType('reading')}
            className={`chip ${type === 'reading' ? 'bg-accent/15 text-accent border-accent/30' : 'bg-surface-2 text-muted border-border'}`}
          >
            <Book size={14} /> Reading
          </button>
          <button
            onClick={() => setType('podcast')}
            className={`chip ${type === 'podcast' ? 'bg-accent/15 text-accent border-accent/30' : 'bg-surface-2 text-muted border-border'}`}
          >
            <Headphones size={14} /> Podcast
          </button>
        </div>

        <Textarea
          placeholder={`What did you ${type === 'reading' ? 'read' : 'listen to'} today?`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full"
          data-testid="input-content"
        />
        <div className="mt-2 mb-3">
          <MicButton onTranscript={(t) => setText((prev) => appendTranscript(prev, t))} />
        </div>

        <Button
          onClick={handleSaveAndPolish}
          disabled={!text.trim() || saving}
          className="w-full"
          data-testid="button-save-polish"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
          {saving ? 'Saving...' : 'Save & Polish for WhatsApp'}
        </Button>
        <p className="text-xs text-muted text-center mt-2">
          Saves your note, then AI-polishes it into WhatsApp-ready bullets.
        </p>
      </Card>

      {/* Platform note */}
      <div className="flex items-start gap-2 text-xs text-muted bg-surface-2 rounded-card p-3">
        <Mic size={14} className="flex-shrink-0 mt-0.5" />
        <span>Voice input requires Chrome (desktop or Android). On other browsers, type manually. Voice transcription is processed in real-time — no audio is stored.</span>
      </div>

      {/* History */}
      <Card>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('reading')}
            className={`chip ${activeTab === 'reading' ? 'bg-accent/15 text-accent border-accent/30' : 'bg-surface-2 text-muted border-border'}`}
          >
            Reading
          </button>
          <button
            onClick={() => setActiveTab('podcast')}
            className={`chip ${activeTab === 'podcast' ? 'bg-accent/15 text-accent border-accent/30' : 'bg-surface-2 text-muted border-border'}`}
          >
            Podcasts
          </button>
        </div>

        <SectionHeader title="History" />

        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted">
            <BookOpen size={24} />
            <p className="text-sm">No {activeTab} entries yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => {
              const status = entryStatuses.get(entry.id);
              return (
                <div key={entry.id} className="bg-surface-2 rounded-card p-3 border border-border/50">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-mono text-muted">{relativeTime(entry.created_at)}</span>
                    <button
                      onClick={() => deleteContent(entry.id)}
                      className="text-muted hover:text-danger transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-sm text-text mb-2">{entry.raw_text}</p>

                  {/* Loading state */}
                  {status === 'loading' && (
                    <div className="flex items-center gap-2 text-xs text-accent">
                      <Loader2 size={14} className="animate-spin" />
                      <span>Polishing...</span>
                    </div>
                  )}

                  {/* Queued state */}
                  {status === 'queued' && (
                    <div className="flex items-center gap-2">
                      <Badge variant="clay"><Clock size={10} /> Queued — will retry when online</Badge>
                    </div>
                  )}

                  {/* Error state */}
                  {status === 'error' && (
                    <div className="flex items-center gap-2">
                      <Badge variant="danger">
                        <AlertCircle size={10} /> Polish failed
                      </Badge>
                      <Button variant="danger" onClick={() => handleRetryPolish(entry)} className="!py-1.5 !px-3 text-xs">
                        <RefreshCw size={12} /> Retry
                      </Button>
                    </div>
                  )}

                  {/* Polished result */}
                  {entry.polished_text && status !== 'loading' && status !== 'queued' && status !== 'error' && (
                    <div className="border-t border-border/50 pt-2 mt-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Badge variant="accent">Polished</Badge>
                        {status === 'cached' && <Badge variant="sage">Cached</Badge>}
                      </div>
                      <p className="text-sm text-muted whitespace-pre-line mb-2">{entry.polished_text}</p>
                      <Button
                        variant="secondary"
                        onClick={() => shareToWhatsApp(entry.polished_text!)}
                        className="!py-1.5 !px-3 text-xs"
                        data-testid={`button-share-${entry.id}`}
                      >
                        <Share2 size={12} /> Share to WhatsApp
                      </Button>
                    </div>
                  )}

                  {/* Not polished yet, no active status */}
                  {!entry.polished_text && status !== 'loading' && status !== 'queued' && status !== 'error' && (
                    <div className="flex items-center gap-2">
                      <Badge variant="muted">Not polished</Badge>
                      <Button
                        variant="ghost"
                        onClick={() => handleRetryPolish(entry)}
                        className="!py-1.5 !px-3 text-xs"
                      >
                        <RefreshCw size={12} /> Polish now
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* WhatsApp note */}
      <div className="flex items-start gap-2 text-xs text-muted bg-surface-2 rounded-card p-3">
        <Share2 size={14} className="flex-shrink-0 mt-0.5" />
        <span>WhatsApp share opens the app with text pre-filled — you still pick the recipient and tap send.</span>
      </div>
    </div>
  );
}
