import { useState, useCallback } from 'react';
import {
  Plus, Phone, MessageSquare, Package, Trash2, ChevronRight, UserPlus, Users as UsersIcon, X,
} from 'lucide-react';
import { useData } from '../hooks/useData';
import { useToast } from '../components/ui/Toast';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Person, PersonCategory, InventoryItem } from '../types/database';
import { initials, relativeTime, formatDate } from '../lib/utils';

// Contact Picker API type
interface ContactInfo {
  name?: string;
  tel?: string;
}

export function Network() {
  const { people, addPerson, updatePerson, deletePerson, markDtmSent, dtmLogs, inventory, addInventory, deleteInventory } = useData();
  const toast = useToast();

  const [filter, setFilter] = useState<'all' | 'prospect' | 'customer'>('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const filteredPeople = people.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'prospect') return p.category === 'prospect' || p.category === 'both';
    if (filter === 'customer') return p.category === 'customer' || p.category === 'both';
    return true;
  });

  // Contact Picker API
  const contactsSupported = typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;

  const importContacts = useCallback(async () => {
    if (!contactsSupported) {
      toast('Contact import is only available on Chrome (Android). Use manual add instead.', 'info');
      return;
    }
    try {
      // @ts-expect-error - Contact Picker API not in TS lib
      const contacts: ContactInfo[] = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      let added = 0;
      for (const contact of contacts) {
        const name = contact.name?.[0] || 'Unknown';
        const phone = contact.tel?.[0] || '';
        if (name !== 'Unknown') {
          await addPerson(name, phone, 'prospect', '');
          added++;
        }
      }
      if (added > 0) toast(`${added} contact${added > 1 ? 's' : ''} imported as prospects`, 'success');
    } catch {
      // User cancelled
    }
  }, [contactsSupported, addPerson, toast]);

  const categoryBadge = (cat: PersonCategory) => {
    if (cat === 'customer') return <Badge variant="sage">Customer</Badge>;
    if (cat === 'prospect') return <Badge variant="clay">Prospect</Badge>;
    return <Badge variant="accent">Both</Badge>;
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5 safe-top">
      <div>
        <h1 className="font-display font-bold text-xl text-text">Network</h1>
        <p className="text-muted text-sm">{people.length} contacts total</p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button onClick={() => setAddModalOpen(true)} className="flex-1" data-testid="button-add-person">
          <Plus size={16} /> Add Manually
        </Button>
        <Button variant="secondary" onClick={importContacts} className="flex-1" data-testid="button-import-contacts">
          <UserPlus size={16} /> Import Contacts
        </Button>
      </div>

      {!contactsSupported && (
        <div className="flex items-start gap-2 text-xs text-muted bg-surface-2 rounded-card p-3">
          <UsersIcon size={14} className="flex-shrink-0 mt-0.5" />
          <span>Contact import works on Chrome for Android only. Manual add is available everywhere.</span>
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`chip ${filter === 'all' ? 'bg-accent/15 text-accent border-accent/30' : 'bg-surface-2 text-muted border-border'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('prospect')}
          className={`chip ${filter === 'prospect' ? 'bg-clay/15 text-clay border-clay/30' : 'bg-surface-2 text-muted border-border'}`}
        >
          Prospects
        </button>
        <button
          onClick={() => setFilter('customer')}
          className={`chip ${filter === 'customer' ? 'bg-sage/15 text-sage border-sage/30' : 'bg-surface-2 text-muted border-border'}`}
        >
          Customers
        </button>
      </div>

      {/* People list */}
      {filteredPeople.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted">
          <UsersIcon size={28} />
          <p className="text-sm">No contacts yet</p>
          <p className="text-xs">Add your first prospect or customer</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPeople.map((person) => (
            <button
              key={person.id}
              onClick={() => setSelectedPerson(person)}
              className="card p-3.5 flex items-center gap-3 w-full text-left hover:border-accent/30 transition-colors"
              data-testid={`card-person-${person.id}`}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-pill flex items-center justify-center font-mono font-semibold text-sm ${
                  person.category === 'customer' ? 'bg-sage/15 text-sage' :
                  person.category === 'prospect' ? 'bg-clay/15 text-clay' :
                  'bg-accent/15 text-accent'
                }`}
              >
                {initials(person.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text truncate">{person.name}</p>
                {person.phone && <p className="text-xs text-muted font-mono truncate">{person.phone}</p>}
              </div>
              {categoryBadge(person.category)}
              <ChevronRight size={16} className="text-muted flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Add person modal */}
      <AddPersonModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={async (name, phone, category, notes) => {
          await addPerson(name, phone, category, notes);
          toast('Contact added', 'success');
          setAddModalOpen(false);
        }}
      />

      {/* Person detail modal */}
      {selectedPerson && (
        <PersonDetail
          person={selectedPerson}
          dtmLogs={dtmLogs.filter((d) => d.person_id === selectedPerson.id)}
          inventory={inventory.filter((i) => i.person_id === selectedPerson.id)}
          onUpdate={updatePerson}
          onDelete={(id) => {
            deletePerson(id);
            setSelectedPerson(null);
            toast('Contact deleted', 'success');
          }}
          onMarkDtm={(personId) => {
            markDtmSent(personId);
            toast('DTM marked as sent', 'success');
          }}
          onAddInventory={addInventory}
          onDeleteInventory={deleteInventory}
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </div>
  );
}

function AddPersonModal({
  open, onClose, onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, phone: string, category: PersonCategory, notes: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<PersonCategory>('prospect');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), phone.trim(), category, notes.trim());
    setName('');
    setPhone('');
    setCategory('prospect');
    setNotes('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Contact">
      <div className="space-y-3">
        <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-person-name" />
        <Input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" data-testid="input-person-phone" />

        <div>
          <p className="text-xs font-mono text-muted uppercase mb-2">Category</p>
          <div className="flex gap-2">
            {(['prospect', 'customer', 'both'] as PersonCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`chip ${category === cat ? 'bg-accent/15 text-accent border-accent/30' : 'bg-surface-2 text-muted border-border'}`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} data-testid="input-person-notes" />

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSubmit} disabled={!name.trim()} className="flex-1" data-testid="button-save-person">
            Add Contact
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}

function PersonDetail({
  person, dtmLogs, inventory, onUpdate, onDelete, onMarkDtm, onAddInventory, onDeleteInventory, onClose,
}: {
  person: Person;
  dtmLogs: { id: string; sent_at: string }[];
  inventory: InventoryItem[];
  onUpdate: (id: string, updates: Partial<Person>) => Promise<void>;
  onDelete: (id: string) => void;
  onMarkDtm: (personId: string) => void;
  onAddInventory: (personId: string, item: string, qty: number, note: string) => Promise<void>;
  onDeleteInventory: (id: string) => void;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(person.notes || '');
  const [invItem, setInvItem] = useState('');
  const [invQty, setInvQty] = useState('1');
  const [invNote, setInvNote] = useState('');
  const [showInventoryForm, setShowInventoryForm] = useState(false);

  const isCustomer = person.category === 'customer' || person.category === 'both';
  const lastDtm = dtmLogs[0];

  const saveNotes = () => {
    onUpdate(person.id, { notes });
  };

  const handleAddInventory = () => {
    if (!invItem.trim()) return;
    onAddInventory(person.id, invItem.trim(), parseInt(invQty) || 1, invNote.trim());
    setInvItem('');
    setInvQty('1');
    setInvNote('');
    setShowInventoryForm(false);
  };

  return (
    <Modal open onClose={onClose} title={person.name}>
      <div className="space-y-4">
        {/* Category picker */}
        <div>
          <p className="text-xs font-mono text-muted uppercase mb-2">Category</p>
          <div className="flex gap-2">
            {(['prospect', 'customer', 'both'] as PersonCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => onUpdate(person.id, { category: cat })}
                className={`chip ${person.category === cat ? 'bg-accent/15 text-accent border-accent/30' : 'bg-surface-2 text-muted border-border'}`}
                data-testid={`button-category-${cat}`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {person.phone && (
            <a href={`tel:${person.phone}`} className="pill-btn bg-sage/20 text-sage border border-sage/30 flex-1" data-testid="button-call">
              <Phone size={16} /> Call
            </a>
          )}
          <Button variant="secondary" onClick={() => onMarkDtm(person.id)} className="flex-1" data-testid="button-dtm">
            <MessageSquare size={16} /> Mark DTM Sent
          </Button>
        </div>

        {/* Last DTM */}
        {lastDtm && (
          <p className="text-xs text-muted font-mono">Last DTM: {relativeTime(lastDtm.sent_at)} • {dtmLogs.length} total sent</p>
        )}

        {/* Notes */}
        <div>
          <p className="text-xs font-mono text-muted uppercase mb-2">Notes</p>
          <Textarea
            placeholder="Add notes about this person..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            data-testid="input-person-detail-notes"
          />
          <Button variant="ghost" onClick={saveNotes} className="!py-1.5 !px-3 text-xs mt-1.5">
            Save Notes
          </Button>
        </div>

        {/* Inventory (customer/both only) */}
        {isCustomer && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-mono text-muted uppercase">Inventory</p>
              <button
                onClick={() => setShowInventoryForm(!showInventoryForm)}
                className="text-xs text-accent flex items-center gap-1"
              >
                <Plus size={12} /> Add Item
              </button>
            </div>

            {showInventoryForm && (
              <div className="space-y-2 mb-3 bg-surface-2 rounded-card p-3">
                <Input placeholder="Item name" value={invItem} onChange={(e) => setInvItem(e.target.value)} data-testid="input-inventory-item" />
                <div className="flex gap-2">
                  <Input placeholder="Qty" value={invQty} onChange={(e) => setInvQty(e.target.value)} type="number" className="w-24" data-testid="input-inventory-qty" />
                  <Input placeholder="Note (optional)" value={invNote} onChange={(e) => setInvNote(e.target.value)} className="flex-1" data-testid="input-inventory-note" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddInventory} disabled={!invItem.trim()} className="flex-1 !py-1.5 text-xs">
                    Add
                  </Button>
                  <Button variant="ghost" onClick={() => setShowInventoryForm(false)}>
                    <X size={14} />
                  </Button>
                </div>
              </div>
            )}

            {inventory.length === 0 && !showInventoryForm ? (
              <p className="text-sm text-muted text-center py-3">No inventory items yet</p>
            ) : (
              <div className="space-y-1.5">
                {inventory.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 bg-surface-2 rounded-card px-3 py-2">
                    <Package size={14} className="text-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text">
                        {item.item} <span className="text-muted font-mono">×{item.qty}</span>
                      </p>
                      {item.note && <p className="text-xs text-muted truncate">{item.note}</p>}
                      <p className="text-[10px] font-mono text-muted">{formatDate(new Date(item.created_at))}</p>
                    </div>
                    <button onClick={() => onDeleteInventory(item.id)} className="text-muted hover:text-danger transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Delete */}
        <div className="pt-2 border-t border-border">
          <Button variant="danger" onClick={() => onDelete(person.id)} className="w-full" data-testid="button-delete-person">
            <Trash2 size={16} /> Delete Contact
          </Button>
        </div>
      </div>
    </Modal>
  );
}
