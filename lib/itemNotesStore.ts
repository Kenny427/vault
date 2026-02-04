import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ItemNote {
  itemId: number;
  itemName: string;
  note: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

interface ItemNotesState {
  notes: ItemNote[];
  addNote: (note: Omit<ItemNote, 'createdAt' | 'updatedAt'>) => void;
  updateNote: (itemId: number, updates: Partial<ItemNote>) => void;
  removeNote: (itemId: number) => void;
  getNote: (itemId: number) => ItemNote | undefined;
}

export const useItemNotesStore = create<ItemNotesState>()(
  persist(
    (set, get) => ({
      notes: [],
      
      addNote: (note) => {
        const now = Date.now();
        const newNote: ItemNote = {
          ...note,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          notes: [...state.notes.filter(n => n.itemId !== note.itemId), newNote]
        }));
      },
      
      updateNote: (itemId, updates) => {
        set((state) => ({
          notes: state.notes.map(n => 
            n.itemId === itemId 
              ? { ...n, ...updates, updatedAt: Date.now() } 
              : n
          )
        }));
      },
      
      removeNote: (itemId) => {
        set((state) => ({
          notes: state.notes.filter(n => n.itemId !== itemId)
        }));
      },
      
      getNote: (itemId) => {
        return get().notes.find(n => n.itemId === itemId);
      },
    }),
    {
      name: 'item-notes-storage',
    }
  )
);
