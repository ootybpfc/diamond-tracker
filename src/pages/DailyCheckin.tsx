import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, X, Pencil, AlertCircle, CalendarCheck } from 'lucide-react';
import { useData } from '../hooks/useData';
import { useToast } from '../components/ui/Toast';
import { Card, SectionHeader } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Textarea, Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { today, currentMonth, relativeTime, formatDate } from '../lib/utils';
import { ChecklistItem } from '../types/database';

export function DailyCheckin() {
  const {
    associations, addAssociation, deleteAssociation,
    dittoLogs, saveDitto,
    accountabilityDays, saveAccountability,
    checklistTemplate, updateChecklistTemplate,
  } = useData();
  const toast = useToast();

  const [assocText, setAssocText] = useState('');
  const [dittoText, setDittoText] = useState('');
  const [editingDitto, setEditingDitto] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  const todayStr = today();
  const monthStr = currentMonth();
  const isFirstOfMonth = new Date().getDate() === 1;

  const todayDitto = dittoLogs.find((d) => d.month === monthStr);
  const todayAccountability = accountabilityDays.find((a) => a.date === todayStr);

  // Build checklist items for today
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [dtmCount, setDtmCount] = useState(0);

  useEffect(() => {
    const templateItems = checklistTemplate?.items || [];
    const savedItems = todayAccountability?.items || [];

    const savedByLabel = new Map(savedItems.map((item) => [item.label, item]));
    const merged: ChecklistItem[] = templateItems.map((label) => {
      const saved = savedByLabel.get(label);
      return { label, checked: saved?.checked ?? false };
    });

    for (const saved of savedItems) {
      if (!templateItems.includes(saved.label)) {
        merged.push(saved);
      }
    }

    setChecklist(merged);
    setDtmCount(todayAccountability?.dtm_count ?? 0);
  }, [checklistTemplate, todayAccountability]);

  const handleAddAssociation = async () => {
    if (!assocText.trim()) return;
    await addAssociation(todayStr, assocText.trim());
    setAssocText('');
    toast('Association logged', 'success');
  };

  const handleSaveDtmCount = async () => {
    await saveAccountability(todayStr, checklist, dtmCount);
    toast('DTM count saved', 'success');
  };

  const handleSaveDitto = async () => {
    if (!dittoText.trim()) return;
    await saveDitto(monthStr, dittoText.trim());
    setDittoText('');
    setEditingDitto(false);
    toast('Ditto saved', 'success');
  };

  const toggleChecklistItem = async (index: number) => {
    const updated = checklist.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item));
    setChecklist(updated);
    await saveAccountability(todayStr, updated, dtmCount);
  };

  const completedCount = checklist.filter((c) => c.checked).length;

  const todayAssociations = associations.filter((a) => a.date === todayStr);
  const recentAssociations = associations.slice(0, 10);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5 safe-top">
      <div>
        <h1 className="font-display font-bold text-xl text-text">Daily Check-in</h1>
        <p className="text-muted text-sm font-mono">{formatDate(new Date())}</p>
      </div>

      {/* Association */}
      <Card>
        <SectionHeader title="Association" />
        <div className="flex gap-2 mb-3">
          <Textarea
            placeholder="Who did you connect with today?"
            value={assocText}
            onChange={(e) => setAssocText(e.target.value)}
            rows={2}
            className="flex-1"
            data-testid="input-association"
          />
          <Button onClick={handleAddAssociation} className="self-start" data-testid="button-add-association">
            <Plus size={16} /> Log
          </Button>
        </div>
        {todayAssociations.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-mono text-muted uppercase mb-1.5">Today</p>
            <div className="space-y-1.5">
              {todayAssociations.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-2 bg-surface-2 rounded-card px-3 py-2">
                  <p className="text-sm text-text flex-1">{a.note}</p>
                  <button onClick={() => deleteAssociation(a.id)} className="text-muted hover:text-danger transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {recentAssociations.length > 0 && (
          <div>
            <p className="text-xs font-mono text-muted uppercase mb-1.5">Recent</p>
            <div className="space-y-1">
              {recentAssociations
                .filter((a) => a.date !== todayStr)
                .slice(0, 5)
                .map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-text flex-1 truncate">{a.note}</span>
                    <span className="text-xs font-mono text-muted">{relativeTime(a.created_at)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </Card>

      {/* Ditto Monthly Card */}
      <Card>
        <SectionHeader
          title="Ditto"
          action={<Badge variant={todayDitto ? 'sage' : 'clay'}>{todayDitto ? 'Done' : 'Pending'}</Badge>}
        />
        {isFirstOfMonth && !todayDitto && (
          <div className="flex items-center gap-2 text-xs text-clay mb-3 bg-clay/10 rounded-card px-3 py-2">
            <AlertCircle size={14} />
            <span>It's the 1st — time to set your monthly Ditto note.</span>
          </div>
        )}
        {todayDitto && !editingDitto ? (
          <div>
            <p className="text-sm text-text mb-2">{todayDitto.note}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted">Logged {relativeTime(todayDitto.logged_at)}</span>
              <Button variant="ghost" onClick={() => { setDittoText(todayDitto.note); setEditingDitto(true); }}>
                <Pencil size={14} /> Edit
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              placeholder="Monthly reflection or focus..."
              value={dittoText}
              onChange={(e) => setDittoText(e.target.value)}
              rows={3}
              data-testid="input-ditto"
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveDitto} disabled={!dittoText.trim()} data-testid="button-save-ditto">
                Save Ditto
              </Button>
              {editingDitto && (
                <Button variant="ghost" onClick={() => { setEditingDitto(false); setDittoText(''); }}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Accountability Checklist */}
      <Card>
        <SectionHeader
          title="Accountability"
          action={
            <button
              onClick={() => setTemplateModalOpen(true)}
              className="text-xs text-muted hover:text-accent transition-colors flex items-center gap-1"
            >
              <Pencil size={12} /> Edit list
            </button>
          }
        />
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <label className="text-sm font-medium">DTM</label>
          <Input
            type="number"
            min={0}
            value={dtmCount}
            onChange={(e) => setDtmCount(Number(e.target.value))}
            className="w-24"
            data-testid="input-dtm-count"
          />
          <Button variant="secondary" onClick={handleSaveDtmCount} data-testid="button-save-dtm">
            Save DTM
          </Button>
        </div>
        {checklist.length === 0 ? (
          <p className="text-sm text-muted text-center py-4">
            No checklist items yet. <button onClick={() => setTemplateModalOpen(true)} className="text-accent">Add items</button> to your daily checklist.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-2 bg-surface-2 rounded-pill overflow-hidden">
                <div
                  className="h-full bg-sage transition-all duration-300"
                  style={{ width: `${checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs font-mono text-muted">{completedCount}/{checklist.length}</span>
            </div>
            <div className="space-y-1.5">
              {checklist.map((item, i) => (
                <button
                  key={i}
                  onClick={() => toggleChecklistItem(i)}
                  className="flex items-center gap-3 w-full bg-surface-2 rounded-card px-3 py-2.5 transition-colors hover:border-accent/30"
                >
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all duration-150 ${
                      item.checked ? 'bg-sage border-sage' : 'border-border'
                    }`}
                  >
                    {item.checked && <Check size={12} className="text-bg" />}
                  </div>
                  <span className={`text-sm ${item.checked ? 'text-muted line-through' : 'text-text'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Checklist template editor modal */}
      <ChecklistTemplateEditor
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        items={checklistTemplate?.items || []}
        onSave={async (items) => {
          await updateChecklistTemplate(items);
          toast('Checklist updated', 'success');
          setTemplateModalOpen(false);
        }}
      />
    </div>
  );
}

function ChecklistTemplateEditor({
  open, onClose, items, onSave,
}: {
  open: boolean;
  onClose: () => void;
  items: string[];
  onSave: (items: string[]) => Promise<void>;
}) {
  const [editItems, setEditItems] = useState<string[]>(items);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    if (open) setEditItems(items);
  }, [open, items]);

  const addItem = () => {
    if (!newItem.trim()) return;
    setEditItems([...editItems, newItem.trim()]);
    setNewItem('');
  };

  const removeItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const editItem = (index: number, value: string) => {
    setEditItems(editItems.map((item, i) => (i === index ? value : item)));
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Checklist">
      <div className="space-y-3">
        {editItems.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted py-4 justify-center">
            <CalendarCheck size={16} />
            <span>No items yet. Add some below.</span>
          </div>
        )}
        {editItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => editItem(i, e.target.value)}
              className="flex-1"
              data-testid={`input-checklist-${i}`}
            />
            <IconButton variant="danger" onClick={() => removeItem(i)}>
              <X size={16} />
            </IconButton>
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            placeholder="New checklist item..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            className="flex-1"
            data-testid="input-new-checklist"
          />
          <Button onClick={addItem} variant="secondary" data-testid="button-add-checklist">
            <Plus size={16} />
          </Button>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={() => onSave(editItems)} className="flex-1" data-testid="button-save-checklist">
            Save Changes
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}
