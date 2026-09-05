import { useEffect, useState } from 'react';
import { SelfTalkOverlay } from './SelfTalkOverlay';
import { useAuth } from '../hooks/useAuth';
import { readItem, writeItem } from '../lib/storage';
import { loadSelfTalk, EMPTY_SELF_TALK, type SelfTalk } from '../lib/selfTalk';

/**
 * Shows the self talk overlay once per login.
 *
 * The flag lives in sessionStorage, not localStorage: it should survive a
 * refresh or a tab restore within the same visit, but be gone the next time the
 * app is opened fresh — which is what "every time I log in" means in practice
 * for an installed PWA. It goes through the safe storage wrapper so a browser
 * blocking site data degrades to showing it once per page load rather than
 * throwing.
 */

const SHOWN_PREFIX = 'dt.selftalk.shown.';

export function SelfTalkGate() {
  const { user } = useAuth();
  const [selfTalk, setSelfTalk] = useState<SelfTalk | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const flagKey = `${SHOWN_PREFIX}${userId}`;
    if (readItem(flagKey, 'session')) return;

    let cancelled = false;
    void loadSelfTalk(userId).then((loaded) => {
      if (cancelled) return;
      writeItem(flagKey, '1', 'session');
      setSelfTalk(loaded);
      setOpen(true);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Fail quiet: a self talk problem must never block access to the app.
  if (!open || !user?.id) return null;

  return (
    <SelfTalkOverlay
      userId={user.id}
      initial={selfTalk ?? EMPTY_SELF_TALK}
      onClose={() => setOpen(false)}
    />
  );
}
