import { useState } from 'react';
import { Plus, Trash2, Loader2, RefreshCw, Check, Target, Mic, AlertCircle, Clock } from 'lucide-react';
import { useData } from '../hooks/useData';
import { useToast } from '../components/ui/Toast';
import { Card, SectionHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { MicButton } from '../components/MicButton';
import { extractActions } from '../lib/ai';
import { CoachSession, ActionItem } from '../types/database';
import { today, relativeTime } from '../lib/utils';

export function Coach() {
  const { coachSessions, addCoachSession, updateCoachSession, deleteCoachSession } = useData();
  const toast = useToast();

  const [notes, setNotes] = useState('');
  const [manualActions, setManualActions] = useState('');
  const [saving, setSaving] = useState(false);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [extractStatus, setExtractStatus] = useState<'idle' | 'loading' | 'error' | 'queued'>('idle');

  const handleSaveSession = async () => {
    if (!notes.trim()) return;
    setSaving(true);

    const sessionDate = today();
    const sessionId = await addCoachSession(sessionDate, notes.trim());
    setSaving(false);

    if (!sessionId) {
      toast('Failed to save session', 'error');
      return;
    }

    // If manual actions provided, use them
    if (manualActions.trim()) {
      const items: ActionItem[] = manualActions
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((text) => ({ text, done: false }));
      await updateCoachSession(sessionId, { action_items: items, extracting: false });
      toast('Session saved with action items', 'success');
    } else {
      // Extract actions via AI
      await runExtraction(sessionId, notes.trim());
    }

    setNotes('');
    setManualActions('');
  };

  const runExtraction = async (sessionId: string, notesText: string) => {
    setExtractingId(sessionId);
    setExtractStatus('loading');
    await updateCoachSession(sessionId, { extracting: true });

    const result = await extractActions(notesText, {
      coachSessionId: sessionId,
      onQueue: () => {
        setExtractStatus('queued');
        toast('Extraction queued — will retry when online', 'info');
      },
    });

    if (result.status === 'done' && result.actions) {
      const items: ActionItem[] = result.actions.map((text) => ({ text, done: false }));
      await updateCoachSession(sessionId, { action_items: items, extracting: false });
      setExtractStatus('idle');
      // Clear the in-flight marker, otherwise `isExtracting` stays true for this
      // session and the freshly extracted action items never render.
      setExtractingId(null);
      toast(`${items.length} action items extracted`, 'success');
    } else if (result.status === 'cached' && result.actions) {
      const items: ActionItem[] = result.actions.map((text) => ({ text, done: false }));
      await updateCoachSession(sessionId, { action_items: items, extracting: false });
      setExtractStatus('idle');
      setExtractingId(null);
      toast('Showing cached action items', 'info');
    } else if (result.status === 'queued') {
      setExtractStatus('queued');
    } else {
      setExtractStatus('error');
      await updateCoachSession(sessionId, { extracting: false });
      toast('Extraction failed — tap retry', 'error');
    }
  };

  const toggleActionItem = async (sessionId: string, index: number, items: ActionItem[]) => {
    const updated = items.map((item, i) => (i === index ? { ...item, done: !item.done } : item));
    await updateCoachSession(sessionId, { action_items: updated });
  };

  const completedCount = (items: ActionItem[]) => items.filter((i) => i.done).length;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5 safe-top">
      <div>
        <h1 className="font-display font-bold text-xl text-text">Coach</h1>
        <p className="text-muted text-sm">Log sessions and track action items</p>
      </div>

      {/* New session card */}
      <Card>
        <SectionHeader title="New Session" />
        <div className="flex gap-2 mb-3">
          <Textarea
            placeholder="What did you discuss in your coaching session?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="flex-1"
            data-testid="input-coach-notes"
          />
          <div className="self-start">
            <MicButton onTranscript={setNotes} />
          </div>
        </div>

        <Textarea
          placeholder="Action items (optional — leave blank to auto-extract from notes)"
          value={manualActions}
          onChange={(e) => setManualActions(e.target.value)}
          rows={2}
          className="mb-3"
          data-testid="input-coach-actions"
        />

        <Button
          onClick={handleSaveSession}
          disabled={!notes.trim() || saving}
          className="w-full"
          data-testid="button-save-session"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {saving ? 'Saving...' : 'Save Session'}
        </Button>
        <p className="text-xs text-muted text-center mt-2">
          {manualActions.trim()
            ? 'Manual action items will be used.'
            : 'Action items will be auto-extracted from your notes.'}
        </p>
      </Card>

      {/* Platform note */}
      <div className="flex items-start gap-2 text-xs text-muted bg-surface-2 rounded-card p-3">
        <Mic size={14} className="flex-shrink-0 mt-0.5" />
        <span>Voice input requires Chrome (desktop or Android). AI extraction requires internet — offline requests are queued.</span>
      </div>

      {/* Sessions */}
      <Card>
        <SectionHeader title="Sessions" />

        {coachSessions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted">
            <Target size={24} />
            <p className="text-sm">No coaching sessions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {coachSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isExtracting={extractingId === session.id}
                extractStatus={extractStatus}
                onToggleItem={(index) => toggleActionItem(session.id, index, session.action_items || [])}
                onRetryExtract={() => runExtraction(session.id, session.notes)}
                onDelete={() => {
                  deleteCoachSession(session.id);
                  toast('Session deleted', 'success');
                }}
                completedCount={completedCount(session.action_items || [])}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function SessionCard({
  session, isExtracting, extractStatus, onToggleItem, onRetryExtract, onDelete, completedCount,
}: {
  session: CoachSession;
  isExtracting: boolean;
  extractStatus: 'idle' | 'loading' | 'error' | 'queued';
  onToggleItem: (index: number) => void;
  onRetryExtract: () => void;
  onDelete: () => void;
  completedCount: number;
}) {
  const items = session.action_items || [];

  return (
    <div className="bg-surface-2 rounded-card p-3.5 border border-border/50">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="text-xs font-mono text-muted">{relativeTime(session.created_at)}</span>
          {items.length > 0 && (
            <span className="text-xs font-mono text-sage ml-2">
              {completedCount}/{items.length} done
            </span>
          )}
        </div>
        <button onClick={onDelete} className="text-muted hover:text-danger transition-colors">
          <Trash2 size={14} />
        </button>
      </div>

      <p className="text-sm text-text mb-2 whitespace-pre-line">{session.notes}</p>

      {/* Extracting state */}
      {isExtracting && extractStatus === 'loading' && (
        <div className="flex items-center gap-2 text-xs text-accent mt-2">
          <Loader2 size={14} className="animate-spin" />
          <span>Extracting action items...</span>
        </div>
      )}

      {isExtracting && extractStatus === 'queued' && (
        <Badge variant="clay"><Clock size={10} /> Extraction queued — will retry when online</Badge>
      )}

      {isExtracting && extractStatus === 'error' && (
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="danger">
            <AlertCircle size={10} /> Extraction failed
          </Badge>
          <Button variant="danger" onClick={onRetryExtract} className="!py-1.5 !px-3 text-xs">
            <RefreshCw size={12} /> Retry
          </Button>
        </div>
      )}

      {/* Action items */}
      {!isExtracting && items.length > 0 && (
        <div className="border-t border-border/50 pt-2 mt-2">
          <p className="text-xs font-mono text-muted uppercase mb-2">Action Items</p>
          <div className="space-y-1">
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => onToggleItem(i)}
                className="flex items-center gap-2.5 w-full text-left py-1"
              >
                <div
                  className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all duration-150 ${
                    item.done ? 'bg-sage border-sage' : 'border-border'
                  }`}
                >
                  {item.done && <Check size={10} className="text-bg" />}
                </div>
                <span className={`text-sm ${item.done ? 'text-muted line-through' : 'text-text'}`}>
                  {item.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No items and not extracting locally — ignore a stale persisted `extracting` flag left over from an interrupted request so the user always has a way to retry */}
      {!isExtracting && items.length === 0 && (
        <div className="flex items-center gap-2 mt-2 border-t border-border/50 pt-2">
          <Badge variant="muted">No action items</Badge>
          <Button variant="ghost" onClick={onRetryExtract} className="!py-1.5 !px-3 text-xs">
            <RefreshCw size={12} /> Extract
          </Button>
        </div>
      )}
    </div>
  );
}
