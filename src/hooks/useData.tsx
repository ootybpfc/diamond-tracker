import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import {
  Association,
  DittoLog,
  ContentEntry,
  Person,
  DtmLog,
  InventoryItem,
  AccountabilityDay,
  ChecklistTemplate,
  CoachSession,
  PersonCategory,
  ContentType,
  ChecklistItem,
  ActionItem,
} from '../types/database';

interface DataContextValue {
  // Data arrays
  associations: Association[];
  dittoLogs: DittoLog[];
  contentEntries: ContentEntry[];
  people: Person[];
  dtmLogs: DtmLog[];
  inventory: InventoryItem[];
  accountabilityDays: AccountabilityDay[];
  checklistTemplate: ChecklistTemplate | null;
  coachSessions: CoachSession[];
  loading: boolean;

  // Association
  addAssociation: (date: string, note: string) => Promise<void>;
  deleteAssociation: (id: string) => Promise<void>;

  // Ditto
  saveDitto: (month: string, note: string) => Promise<void>;

  // Content
  addContent: (type: ContentType, date: string, raw_text: string) => Promise<string | null>;
  updateContentPolished: (id: string, polished: string) => Promise<void>;
  deleteContent: (id: string) => Promise<void>;

  // People
  addPerson: (name: string, phone: string, category: PersonCategory, notes: string) => Promise<void>;
  updatePerson: (id: string, updates: Partial<Omit<Person, 'id' | 'user_id' | 'created_at'>>) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;

  // DTM
  markDtmSent: (personId: string) => Promise<void>;

  // Inventory
  addInventory: (personId: string, item: string, qty: number, note: string) => Promise<void>;
  deleteInventory: (id: string) => Promise<void>;

  // Accountability
  saveAccountability: (date: string, items: ChecklistItem[], dtmCount?: number) => Promise<void>;

  // Checklist template
  updateChecklistTemplate: (items: string[]) => Promise<void>;

  // Coach
  addCoachSession: (date: string, notes: string) => Promise<string | null>;
  updateCoachSession: (id: string, updates: Partial<Omit<CoachSession, 'id' | 'user_id' | 'created_at'>>) => Promise<void>;
  deleteCoachSession: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [associations, setAssociations] = useState<Association[]>([]);
  const [dittoLogs, setDittoLogs] = useState<DittoLog[]>([]);
  const [contentEntries, setContentEntries] = useState<ContentEntry[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [dtmLogs, setDtmLogs] = useState<DtmLog[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [accountabilityDays, setAccountabilityDays] = useState<AccountabilityDay[]>([]);
  const [checklistTemplate, setChecklistTemplate] = useState<ChecklistTemplate | null>(null);
  const [coachSessions, setCoachSessions] = useState<CoachSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all data
  const loadAll = useCallback(async () => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('session uid', sessionData.session?.user?.id);

      const [
        assocRes, dittoRes, contentRes, peopleRes, dtmRes,
        invRes, accRes, templateRes, coachRes,
      ] = await Promise.all([
        supabase.from('associations').select('*').order('date', { ascending: false }),
        supabase.from('ditto_logs').select('*').order('month', { ascending: false }),
        supabase.from('content_entries').select('*').order('created_at', { ascending: false }),
        supabase.from('people').select('*').order('created_at', { ascending: false }),
        supabase.from('dtm_log').select('*').order('sent_at', { ascending: false }),
        supabase.from('inventory').select('*').order('created_at', { ascending: false }),
        supabase.from('accountability_days').select('*').order('date', { ascending: false }),
        supabase.from('checklist_template').select('*').limit(1).maybeSingle(),
        supabase.from('coach_sessions').select('*').order('created_at', { ascending: false }),
      ]);

      console.log('associations rows', assocRes.data?.length, 'error', assocRes.error);

      setAssociations(assocRes.data || []);
      setDittoLogs(dittoRes.data || []);
      setContentEntries(contentRes.data || []);
      setPeople(peopleRes.data || []);
      setDtmLogs(dtmRes.data || []);
      setInventory(invRes.data || []);
      setAccountabilityDays(accRes.data || []);
      setChecklistTemplate(templateRes.data || null);
      setCoachSessions(coachRes.data || []);
    } catch {
      // Tables might not exist yet
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Realtime subscriptions
  useEffect(() => {
    if (!supabase || !user) return;

    const channels = [
      supabase.channel('associations').on('postgres_changes', { event: '*', schema: 'public', table: 'associations' }, () => loadAll()),
      supabase.channel('ditto_logs').on('postgres_changes', { event: '*', schema: 'public', table: 'ditto_logs' }, () => loadAll()),
      supabase.channel('content_entries').on('postgres_changes', { event: '*', schema: 'public', table: 'content_entries' }, () => loadAll()),
      supabase.channel('people').on('postgres_changes', { event: '*', schema: 'public', table: 'people' }, () => loadAll()),
      supabase.channel('dtm_log').on('postgres_changes', { event: '*', schema: 'public', table: 'dtm_log' }, () => loadAll()),
      supabase.channel('inventory').on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => loadAll()),
      supabase.channel('accountability_days').on('postgres_changes', { event: '*', schema: 'public', table: 'accountability_days' }, () => loadAll()),
      supabase.channel('checklist_template').on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_template' }, () => loadAll()),
      supabase.channel('coach_sessions').on('postgres_changes', { event: '*', schema: 'public', table: 'coach_sessions' }, () => loadAll()),
    ];

    channels.forEach((ch) => ch.subscribe());

    return () => {
      channels.forEach((ch) => supabase!.removeChannel(ch));
    };
  }, [user, loadAll]);

  // ---- Association ----
  const addAssociation = useCallback(async (date: string, note: string) => {
    if (!supabase || !user) return;
    const { data } = await supabase.from('associations').insert({ user_id: user.id, date, note }).select().single();
    if (data) setAssociations((prev) => [data, ...prev]);
  }, [user]);

  const deleteAssociation = useCallback(async (id: string) => {
    if (!supabase) return;
    await supabase.from('associations').delete().eq('id', id);
    setAssociations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // ---- Ditto ----
  const saveDitto = useCallback(async (month: string, note: string) => {
    if (!supabase || !user) return;
    const existing = dittoLogs.find((d) => d.month === month);
    if (existing) {
      const { data } = await supabase.from('ditto_logs').update({ note, logged_at: new Date().toISOString() }).eq('id', existing.id).select().single();
      if (data) setDittoLogs((prev) => prev.map((d) => (d.id === data.id ? data : d)));
    } else {
      const { data } = await supabase.from('ditto_logs').insert({ user_id: user.id, month, note }).select().single();
      if (data) setDittoLogs((prev) => [data, ...prev]);
    }
  }, [user, dittoLogs]);

  // ---- Content ----
  const addContent = useCallback(async (type: ContentType, date: string, raw_text: string) => {
    if (!supabase || !user) return null;
    const { data } = await supabase.from('content_entries').insert({ user_id: user.id, type, date, raw_text }).select().single();
    if (data) setContentEntries((prev) => [data, ...prev]);
    return data?.id ?? null;
  }, [user]);

  const updateContentPolished = useCallback(async (id: string, polished: string) => {
    if (!supabase) return;
    await supabase.from('content_entries').update({ polished_text: polished }).eq('id', id);
    setContentEntries((prev) => prev.map((c) => (c.id === id ? { ...c, polished_text: polished } : c)));
  }, []);

  const deleteContent = useCallback(async (id: string) => {
    if (!supabase) return;
    await supabase.from('content_entries').delete().eq('id', id);
    setContentEntries((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // ---- People ----
  const addPerson = useCallback(async (name: string, phone: string, category: PersonCategory, notes: string) => {
    if (!supabase || !user) return;
    const { data } = await supabase.from('people').insert({ user_id: user.id, name, phone, category, notes }).select().single();
    if (data) setPeople((prev) => [data, ...prev]);
  }, [user]);

  const updatePerson = useCallback(async (id: string, updates: Partial<Omit<Person, 'id' | 'user_id' | 'created_at'>>) => {
    if (!supabase) return;
    const { data } = await supabase.from('people').update(updates).eq('id', id).select().single();
    if (data) setPeople((prev) => prev.map((p) => (p.id === id ? data : p)));
  }, []);

  const deletePerson = useCallback(async (id: string) => {
    if (!supabase) return;
    await supabase.from('people').delete().eq('id', id);
    setPeople((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ---- DTM ----
  const markDtmSent = useCallback(async (personId: string) => {
    if (!supabase || !user) return;
    const { data } = await supabase.from('dtm_log').insert({ user_id: user.id, person_id: personId }).select().single();
    if (data) setDtmLogs((prev) => [data, ...prev]);
  }, [user]);

  // ---- Inventory ----
  const addInventory = useCallback(async (personId: string, item: string, qty: number, note: string) => {
    if (!supabase || !user) return;
    const { data } = await supabase.from('inventory').insert({ user_id: user.id, person_id: personId, item, qty, note }).select().single();
    if (data) setInventory((prev) => [data, ...prev]);
  }, [user]);

  const deleteInventory = useCallback(async (id: string) => {
    if (!supabase) return;
    await supabase.from('inventory').delete().eq('id', id);
    setInventory((prev) => prev.filter((i) => i.id !== id));
  }, []);

  // ---- Accountability ----
  const saveAccountability = useCallback(async (date: string, items: ChecklistItem[], dtmCount?: number) => {
    if (!supabase || !user) return;
    const existing = accountabilityDays.find((a) => a.date === date);
    if (existing) {
      const updatePayload: { items: ChecklistItem[]; dtm_count?: number } = { items };
      if (dtmCount !== undefined) updatePayload.dtm_count = dtmCount;
      const { data } = await supabase.from('accountability_days').update(updatePayload).eq('id', existing.id).select().single();
      if (data) setAccountabilityDays((prev) => prev.map((a) => (a.id === data.id ? data : a)));
    } else {
      const { data } = await supabase.from('accountability_days').insert({ user_id: user.id, date, items, dtm_count: dtmCount ?? 0 }).select().single();
      if (data) setAccountabilityDays((prev) => [data, ...prev]);
    }
  }, [user, accountabilityDays]);

  // ---- Checklist Template ----
  const updateChecklistTemplate = useCallback(async (items: string[]) => {
    if (!supabase || !user) return;
    if (checklistTemplate) {
      const { data } = await supabase.from('checklist_template').update({ items }).eq('id', checklistTemplate.id).select().single();
      if (data) setChecklistTemplate(data);
    } else {
      const { data } = await supabase.from('checklist_template').insert({ user_id: user.id, items }).select().single();
      if (data) setChecklistTemplate(data);
    }
  }, [user, checklistTemplate]);

  // ---- Coach ----
  const addCoachSession = useCallback(async (date: string, notes: string) => {
    if (!supabase || !user) return null;
    const { data } = await supabase.from('coach_sessions').insert({ user_id: user.id, date, notes, action_items: [], extracting: false }).select().single();
    if (data) setCoachSessions((prev) => [data, ...prev]);
    return data?.id ?? null;
  }, [user]);

  const updateCoachSession = useCallback(async (id: string, updates: Partial<Omit<CoachSession, 'id' | 'user_id' | 'created_at'>>) => {
    if (!supabase) return;
    const { data } = await supabase.from('coach_sessions').update(updates).eq('id', id).select().single();
    if (data) setCoachSessions((prev) => prev.map((s) => (s.id === id ? data : s)));
  }, []);

  const deleteCoachSession = useCallback(async (id: string) => {
    if (!supabase) return;
    await supabase.from('coach_sessions').delete().eq('id', id);
    setCoachSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return (
    <DataContext.Provider
      value={{
        associations, dittoLogs, contentEntries, people, dtmLogs, inventory,
        accountabilityDays, checklistTemplate, coachSessions, loading,
        addAssociation, deleteAssociation, saveDitto,
        addContent, updateContentPolished, deleteContent,
        addPerson, updatePerson, deletePerson,
        markDtmSent, addInventory, deleteInventory,
        saveAccountability, updateChecklistTemplate,
        addCoachSession, updateCoachSession, deleteCoachSession,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (ctx === undefined) {
    return {
      associations: [],
      dittoLogs: [],
      contentEntries: [],
      people: [],
      dtmLogs: [],
      inventory: [],
      accountabilityDays: [],
      checklistTemplate: null,
      coachSessions: [],
      loading: true,
      addAssociation: async () => {},
      deleteAssociation: async () => {},
      saveDitto: async () => {},
      addContent: async () => null,
      updateContentPolished: async () => {},
      deleteContent: async () => {},
      addPerson: async () => {},
      updatePerson: async () => {},
      deletePerson: async () => {},
      markDtmSent: async () => {},
      addInventory: async () => {},
      deleteInventory: async () => {},
      saveAccountability: async () => {},
      updateChecklistTemplate: async () => {},
      addCoachSession: async () => null,
      updateCoachSession: async () => {},
      deleteCoachSession: async () => {},
    };
  }
  return ctx;
}
