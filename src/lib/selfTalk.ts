import { supabase } from './supabase';

/**
 * Self talk is one row per user, so the read is a point lookup and the write is
 * an upsert on the primary key. No history, no list — it is a single standing
 * statement the user reads back to themselves.
 */

export interface SelfTalk {
  content: string;
  updatedAt: string | null;
}

export const EMPTY_SELF_TALK: SelfTalk = { content: '', updatedAt: null };

export async function loadSelfTalk(userId: string): Promise<SelfTalk> {
  if (!supabase) return EMPTY_SELF_TALK;

  const { data, error } = await supabase
    .from('self_talk')
    .select('content, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  // maybeSingle avoids the "no rows" error for a user who has never written any.
  if (error || !data) return EMPTY_SELF_TALK;

  return {
    content: typeof data.content === 'string' ? data.content : '',
    updatedAt: (data.updated_at as string | null) ?? null,
  };
}

export async function saveSelfTalk(userId: string, content: string): Promise<string | null> {
  if (!supabase) return 'Not connected';

  const { error } = await supabase.from('self_talk').upsert(
    {
      user_id: userId,
      content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  // supabase-js resolves with an error rather than throwing, so this has to be
  // checked explicitly or a failed save looks like a successful one.
  return error?.message ?? null;
}

export type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'paragraph'; text: string };

const BULLET = /^\s*(?:[-*•·]|\d+[.)])\s+(.*)$/;
const HEADING = /^\s*(?:#+\s*(.+?)|(.+?):)\s*$/;

/**
 * Turn free text into blocks so the overlay can lay it out properly instead of
 * dumping one undifferentiated wall of characters. Deliberately forgiving: this
 * is someone's personal writing, not markdown they are trying to get right.
 */
export function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const bullet = BULLET.exec(line);
    if (bullet) {
      blocks.push({ kind: 'bullet', text: bullet[1].trim() });
      continue;
    }

    // A short line ending in a colon, or a markdown heading, reads as a header.
    const heading = HEADING.exec(line);
    if (heading) {
      const text = (heading[1] ?? heading[2] ?? '').trim();
      if (text && text.length <= 60) {
        blocks.push({ kind: 'heading', text });
        continue;
      }
    }

    blocks.push({ kind: 'paragraph', text: line });
  }

  return blocks;
}

/** Roughly how much text there is, used to pick a starting type scale. */
export function contentWeight(content: string): number {
  const chars = content.trim().length;
  const lines = content.trim().split(/\r?\n/).filter((l) => l.trim()).length;
  // Each line break costs vertical space regardless of how short the line is.
  return chars + lines * 28;
}
