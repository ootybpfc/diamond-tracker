/**
 * Per-device user settings.
 *
 * The Gemini API key is deliberately kept in localStorage rather than Supabase:
 * it stays on the user's own device, never lands in the database, and is only
 * sent to our own /api routes at request time. The trade-off is that it must be
 * entered once per device.
 */

const STORAGE_KEY = 'dt.settings.v1';

export interface UserSettings {
  /** Personal Gemini key from Google AI Studio. Empty means "use the app's shared key". */
  geminiApiKey: string;
  /** BCP-47 tag passed to the transcriber, or 'auto' to let the model detect it. */
  transcriptionLanguage: string;
  /** Names/jargon fed to the transcriber so it spells them correctly. */
  vocabulary: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  geminiApiKey: '',
  transcriptionLanguage: 'auto',
  vocabulary: '',
};

export const LANGUAGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'English (Indian accent)', label: 'English — India' },
  { value: 'English (US accent)', label: 'English — US' },
  { value: 'English (UK accent)', label: 'English — UK' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Hinglish, a mix of Hindi and English', label: 'Hinglish (mixed)' },
  { value: 'Tamil', label: 'Tamil' },
  { value: 'Telugu', label: 'Telugu' },
  { value: 'Malayalam', label: 'Malayalam' },
  { value: 'Kannada', label: 'Kannada' },
  { value: 'Marathi', label: 'Marathi' },
  { value: 'Gujarati', label: 'Gujarati' },
  { value: 'Punjabi', label: 'Punjabi' },
  { value: 'Bengali', label: 'Bengali' },
];

export function loadSettings(): UserSettings {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    // Corrupt or unreadable storage should never break the app.
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: UserSettings): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    // Let other open tabs/components react immediately.
    window.dispatchEvent(new CustomEvent('dt-settings-changed'));
  } catch {
    // Private-mode Safari and full quotas both throw here; ignore.
  }
}

/** Headers to attach to /api calls so the server uses this user's own key. */
export function aiHeaders(): Record<string, string> {
  const key = loadSettings().geminiApiKey.trim();
  return key ? { 'x-user-api-key': key } : {};
}

/** Show only the last 4 characters, e.g. "AIza••••••••7f3K". */
export function maskKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '••••••••';
  return `${trimmed.slice(0, 4)}${'•'.repeat(8)}${trimmed.slice(-4)}`;
}

/** Google AI Studio keys look like "AIza" + 35 more chars. */
export function looksLikeGeminiKey(key: string): boolean {
  return /^AIza[0-9A-Za-z_-]{30,}$/.test(key.trim());
}
