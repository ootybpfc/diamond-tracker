import { useState, useEffect } from 'react';
import { processQueue } from '../lib/ai';
import { supabase } from '../lib/supabase';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Process the offline AI queue
      processQueue({
        onPolish: async (entry) => {
          if (!supabase || !entry.contentEntryId) return;
          await supabase
            .from('content_entries')
            .update({ polished_text: entry.result })
            .eq('id', entry.contentEntryId);
        },
        onExtract: async (entry) => {
          if (!supabase || !entry.coachSessionId) return;
          await supabase
            .from('coach_sessions')
            .update({
              action_items: entry.result.map((text) => ({ text, done: false })),
              extracting: false,
            })
            .eq('id', entry.coachSessionId);
        },
      }).catch(() => {});
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
