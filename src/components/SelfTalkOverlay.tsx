import { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, X, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import { useFitText } from '../hooks/useFitText';
import { parseBlocks, contentWeight, saveSelfTalk, type SelfTalk } from '../lib/selfTalk';

interface Props {
  userId: string;
  initial: SelfTalk;
  onClose: () => void;
}

/**
 * Full-screen so it reads as a moment rather than a dialog to dismiss. Opens
 * read-only on each login; editing is a deliberate second step.
 */
export function SelfTalkOverlay({ userId, initial, onClose }: Props) {
  const toast = useToast();
  const [content, setContent] = useState(initial.content);
  // Someone with nothing saved has nothing to read, so start them writing.
  const [editing, setEditing] = useState(initial.content.trim().length === 0);
  const [draft, setDraft] = useState(initial.content);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const blocks = useMemo(() => parseBlocks(content), [content]);
  const weight = contentWeight(content);

  // Ceiling by volume. The fit search decides the final size; this only stops
  // a short line rendering absurdly large, and stops a long passage starting
  // its search miles above where it will land.
  const max = weight < 60 ? 60 : weight < 140 ? 48 : weight < 320 ? 38 : weight < 700 ? 28 : 22;
  const { containerRef, contentRef, measured } = useFitText<HTMLDivElement>({
    max,
    min: 14,
    deps: [content, editing],
  });

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !editing) onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [editing, onClose]);

  const handleSave = async () => {
    setSaving(true);
    const err = await saveSelfTalk(userId, draft);
    setSaving(false);

    if (err) {
      toast(`Could not save: ${err}`, 'error');
      return;
    }
    setContent(draft);
    setEditing(false);
    toast('Self talk saved', 'success');
    if (!draft.trim()) onClose();
  };

  const isEmpty = content.trim().length === 0;

  return (
    <div className="fixed inset-0 z-[60] bg-bg flex flex-col animate-fade-in">
      <header className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
        <h1 className="font-display font-bold text-xl text-text">Self Talk</h1>
        <div className="flex items-center gap-1">
          {!editing && !isEmpty && (
            <button
              onClick={() => {
                setDraft(content);
                setEditing(true);
              }}
              className="p-2 text-muted hover:text-text transition-colors"
              aria-label="Edit self talk"
              data-testid="button-edit-selftalk"
            >
              <Pencil size={18} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-text transition-colors"
            aria-label="Close"
            data-testid="button-close-selftalk"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {editing ? (
        <div className="flex-1 flex flex-col px-5 pb-5 min-h-0">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              'Write what you want to tell yourself every day.\n\n' +
              'One line per thought works well. Start a line with a dash for a list, ' +
              'or end it with a colon to make it a heading.'
            }
            className="flex-1 w-full bg-surface border border-border rounded-card p-4 text-text text-base leading-relaxed placeholder:text-muted/60 focus:outline-none focus:border-accent/60 resize-none min-h-0"
            data-testid="input-selftalk"
          />
          <div className="flex gap-2 mt-4 shrink-0">
            <Button
              onClick={() => void handleSave()}
              disabled={saving}
              className="flex-1"
              data-testid="button-save-selftalk"
            >
              <Check size={16} className="mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            {!isEmpty && (
              <Button
                variant="secondary"
                onClick={() => {
                  setDraft(content);
                  setEditing(false);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div
            ref={containerRef}
            className="flex-1 min-h-0 overflow-y-auto px-6 flex items-center"
            data-testid="selftalk-display"
          >
            <div
              ref={contentRef}
              // Hidden until measured so the user never sees it snap from the
              // starting size down to the fitted one.
              style={{ opacity: measured ? 1 : 0 }}
              className="w-full py-4 transition-opacity duration-200 font-display font-semibold text-text leading-[1.35]"
            >
              {blocks.map((block, i) => {
                if (block.kind === 'heading') {
                  return (
                    <p
                      key={i}
                      className="text-accent uppercase tracking-wide font-bold mb-[0.5em]"
                      style={{ fontSize: '0.62em' }}
                    >
                      {block.text}
                    </p>
                  );
                }
                if (block.kind === 'bullet') {
                  return (
                    <p key={i} className="flex gap-[0.5em] mb-[0.45em]">
                      <span className="text-accent shrink-0">—</span>
                      <span>{block.text}</span>
                    </p>
                  );
                }
                return (
                  <p key={i} className="mb-[0.45em] last:mb-0">
                    {block.text}
                  </p>
                );
              })}
            </div>
          </div>

          <div className="px-5 pb-6 pt-2 shrink-0 safe-bottom">
            <Button onClick={onClose} className="w-full" data-testid="button-done-selftalk">
              Let's go
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
