import { useEffect, useState } from 'react';
import { KeyRound, ExternalLink, Check, Trash2, LogOut, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../hooks/useAuth';
import {
  loadSettings,
  saveSettings,
  maskKey,
  looksLikeGeminiKey,
  LANGUAGE_OPTIONS,
  settingsPersist,
  type UserSettings,
} from '../lib/settings';

export function Settings() {
  const { user, signOut } = useAuth();
  const toast = useToast();

  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const [keyInput, setKeyInput] = useState('');
  const [editingKey, setEditingKey] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const hasOwnKey = settings.geminiApiKey.trim().length > 0;
  // Blocked site data means everything here is memory-only until the app closes.
  const [canPersist] = useState(() => settingsPersist());

  useEffect(() => {
    if (editingKey) setKeyInput('');
  }, [editingKey]);

  const persist = (next: UserSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const handleSaveKey = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      toast('Enter a key first', 'error');
      return;
    }
    if (!looksLikeGeminiKey(trimmed)) {
      toast('That does not look like a Google AI Studio key (they start with "AIza")', 'error');
      return;
    }

    setVerifying(true);
    try {
      // Prove the key works before saving it, so failures surface here rather
      // than the first time the user tries to record something.
      const res = await fetch('/api/polish-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-api-key': trimmed },
        body: JSON.stringify({ text: 'Test note to verify the API key.', type: 'reading' }),
      });

      if (!res.ok) {
        const detail = (await res.json().catch(() => ({}))) as { error?: string };
        toast(detail.error || `Key check failed (${res.status})`, 'error');
        return;
      }

      persist({ ...settings, geminiApiKey: trimmed });
      setEditingKey(false);
      setKeyInput('');
      toast(
        canPersist
          ? 'API key verified and saved on this device'
          : 'Key verified. Storage is blocked, so it lasts until you close the app.',
        'success',
      );
    } catch {
      toast('Could not reach the server to verify the key', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleRemoveKey = () => {
    persist({ ...settings, geminiApiKey: '' });
    setEditingKey(false);
    setKeyInput('');
    toast('Removed. This device will use the shared key.', 'info');
  };

  return (
    <div className="p-4 space-y-6 pb-24 animate-fade-in">
      <header>
        <h1 className="font-display font-bold text-2xl text-text">Settings</h1>
        {user?.email && <p className="text-muted text-sm mt-1 break-all">{user.email}</p>}
      </header>

      {!canPersist && (
        <div
          className="flex items-start gap-3 bg-clay/10 border border-clay/30 rounded-card p-4"
          data-testid="banner-no-storage"
        >
          <AlertTriangle size={18} className="text-clay mt-0.5 shrink-0" />
          <div className="min-w-0">
            <h2 className="font-semibold text-text text-sm">
              This browser is blocking storage
            </h2>
            <p className="text-sm text-muted mt-1 leading-relaxed">
              Settings below will work, but they are forgotten when you close the app.
              This usually means cookies and site data are blocked, or you opened the
              app inside another app's browser. Open it in Chrome or Safari directly,
              or allow site data for this site, to make settings stick.
            </p>
          </div>
        </div>
      )}

      {/* ---- AI key ---- */}
      <section className="bg-surface rounded-card border border-border p-4 space-y-4">
        <div className="flex items-start gap-3">
          <KeyRound size={18} className="text-accent mt-0.5 shrink-0" />
          <div className="min-w-0">
            <h2 className="font-semibold text-text">Gemini API key</h2>
            <p className="text-sm text-muted mt-1 leading-relaxed">
              Powers voice transcription, WhatsApp polishing and coach action items. Leave this
              empty to use the app's shared key, or add your own so your usage counts against your
              own free Google quota.
            </p>
          </div>
        </div>

        <div
          className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 border ${
            hasOwnKey
              ? 'text-sage bg-sage/10 border-sage/30'
              : 'text-muted bg-surface-2 border-border'
          }`}
          data-testid="text-key-status"
        >
          {hasOwnKey ? (
            <>
              <Check size={15} className="shrink-0" />
              <span className="font-mono break-all">{maskKey(settings.geminiApiKey)}</span>
            </>
          ) : (
            <span>Using the app's shared key</span>
          )}
        </div>

        {editingKey ? (
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="AIza..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              data-testid="input-api-key"
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveKey} disabled={verifying} className="flex-1" data-testid="button-save-key">
                {verifying ? 'Verifying...' : 'Verify & Save'}
              </Button>
              <Button variant="secondary" onClick={() => setEditingKey(false)} disabled={verifying}>
                Cancel
              </Button>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
            >
              Get a free key from Google AI Studio <ExternalLink size={13} />
            </a>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditingKey(true)} className="flex-1" data-testid="button-edit-key">
              {hasOwnKey ? 'Replace key' : 'Add my own key'}
            </Button>
            {hasOwnKey && (
              <Button variant="secondary" onClick={handleRemoveKey} aria-label="Remove key" data-testid="button-remove-key">
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        )}

        <p className="text-xs text-muted leading-relaxed">
          {canPersist
            ? "Stored only in this browser on this device — never saved to the database. You'll need to add it again on other devices."
            : 'Because storage is blocked, this key is kept in memory only and will be gone when you close the app.'}
        </p>
      </section>

      {/* ---- Voice ---- */}
      <section className="bg-surface rounded-card border border-border p-4 space-y-4">
        <div>
          <h2 className="font-semibold text-text">Voice transcription</h2>
          <p className="text-sm text-muted mt-1 leading-relaxed">
            Naming the language you speak noticeably improves accuracy over auto-detect.
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm text-muted">Spoken language</span>
          <select
            value={settings.transcriptionLanguage}
            onChange={(e) => persist({ ...settings, transcriptionLanguage: e.target.value })}
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-text focus:outline-none focus:border-accent/60"
            data-testid="select-language"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-muted">Names &amp; words to get right</span>
          <textarea
            value={settings.vocabulary}
            onChange={(e) => persist({ ...settings, vocabulary: e.target.value })}
            placeholder="Product names, people you mention often, company jargon..."
            rows={3}
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-text placeholder:text-muted/60 focus:outline-none focus:border-accent/60 resize-y"
            data-testid="input-vocabulary"
          />
          <span className="text-xs text-muted">
            Comma-separated. These are passed to the transcriber so it spells them correctly.
          </span>
        </label>
      </section>

      <Button variant="secondary" onClick={() => void signOut()} className="w-full" data-testid="button-signout">
        <LogOut size={16} className="mr-2" /> Sign out
      </Button>
    </div>
  );
}
