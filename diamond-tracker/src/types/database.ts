// Database types matching Supabase schema

export type PersonCategory = 'prospect' | 'customer' | 'both';

export type ContentType = 'reading' | 'podcast';

export interface Association {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  note: string;
  created_at: string;
}

export interface DittoLog {
  id: string;
  user_id: string;
  month: string; // YYYY-MM
  note: string;
  logged_at: string;
}

export interface ContentEntry {
  id: string;
  user_id: string;
  type: ContentType;
  date: string;
  raw_text: string;
  polished_text: string | null;
  created_at: string;
}

export interface Person {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  category: PersonCategory;
  notes: string | null;
  created_at: string;
}

export interface DtmLog {
  id: string;
  user_id: string;
  person_id: string;
  sent_at: string;
}

export interface InventoryItem {
  id: string;
  user_id: string;
  person_id: string;
  item: string;
  qty: number;
  note: string | null;
  created_at: string;
}

export interface ChecklistItem {
  label: string;
  checked: boolean;
}

export interface AccountabilityDay {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD, unique per user
  items: ChecklistItem[]; // jsonb
}

export interface ChecklistTemplate {
  id: string;
  user_id: string;
  items: string[]; // jsonb array of strings
}

export interface ActionItem {
  text: string;
  done: boolean;
}

export interface CoachSession {
  id: string;
  user_id: string;
  date: string;
  notes: string;
  action_items: ActionItem[]; // jsonb
  extracting: boolean;
  created_at: string;
}

// Activity types for dashboard aggregation
export type ActivityType = 'association' | 'reading' | 'podcast' | 'dtm';

export interface DayActivity {
  date: string;
  types: Set<ActivityType>;
  count: number;
}

// AI queue entry (IndexedDB)
export interface AIQueueEntry {
  id: string;
  type: 'polish' | 'extract';
  payload: { text: string; type?: ContentType } | { notes: string };
  contentEntryId?: string; // for polish — to update the content entry
  coachSessionId?: string; // for extract — to update the session
  created_at: string;
}
