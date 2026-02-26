import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';

export interface ItemNote {
  itemId: number;
  itemName: string;
  note: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  synced?: boolean;
}

interface ItemNotesState {
  notes: ItemNote[];
  addNote: (note: Omit<ItemNote, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateNote: (itemId: number, updates: Partial<ItemNote>) => Promise<void>;
  removeNote: (itemId: number) => Promise<void>;
  getNote: (itemId: number) => ItemNote | undefined;
  loadFromSupabase: () => Promise<void>;
}

export const useItemNotesStore = create<ItemNotesState>()(
  persist(
    (set, get) => ({
      notes: [],
      
      addNote: async (note) => {
        const now = Date.now();
        const newNote: ItemNote = {
          ...note,
          createdAt: now,
          updatedAt: now,
          synced: false,
        };
        set((state) => ({
          notes: [...state.notes.filter(n => n.itemId !== note.itemId), newNote]
        }));

        // Try to sync to Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { error } = await supabase
            .from('item_notes')
            .upsert({
              user_id: session.user.id,
              item_id: note.itemId,
              item_name: note.itemName,
              notes: note.note,
              tags: note.tags,
            }, { onConflict: 'user_id,item_id' });

          if (!error) {
            set((state) => ({
              notes: state.notes.map(n =>
                n.itemId === note.itemId ? { ...n, synced: true } : n
              )
            }));
          }
        }
      },
      
      updateNote: async (itemId, updates) => {
        set((state) => ({
          notes: state.notes.map(n => 
            n.itemId === itemId 
              ? { ...n, ...updates, updatedAt: Date.now(), synced: false } 
              : n
          )
        }));

        // Try to sync to Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const note = get().notes.find(n => n.itemId === itemId);
          if (note) {
            const { error } = await supabase
              .from('item_notes')
              .upsert({
                user_id: session.user.id,
                item_id: itemId,
                item_name: note.itemName,
                notes: updates.note || note.note,
                tags: updates.tags || note.tags,
              }, { onConflict: 'user_id,item_id' });

            if (!error) {
              set((state) => ({
                notes: state.notes.map(n =>
                  n.itemId === itemId ? { ...n, synced: true } : n
                )
              }));
            }
          }
        }
      },
      
      removeNote: async (itemId) => {
        set((state) => ({
          notes: state.notes.filter(n => n.itemId !== itemId)
        }));

        // Try to sync to Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase
            .from('item_notes')
            .delete()
            .eq('user_id', session.user.id)
            .eq('item_id', itemId);
        }
      },
      
      getNote: (itemId) => {
        return get().notes.find(n => n.itemId === itemId);
      },

      loadFromSupabase: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: notesData } = await supabase
          .from('item_notes')
          .select('*')
          .eq('user_id', session.user.id);

        if (notesData) {
          const notes: ItemNote[] = notesData.map((note: any) => ({
            itemId: note.item_id,
            itemName: note.item_name,
            note: note.notes,
            tags: note.tags || [],
            createdAt: new Date(note.created_at).getTime(),
            updatedAt: new Date(note.updated_at).getTime(),
            synced: true,
          }));

          set({ notes });
        }
      },
    }),
    {
      name: 'item-notes-storage',
    }
  )
);

