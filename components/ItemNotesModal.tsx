'use client';

import { useState } from 'react';
import { useItemNotesStore } from '@/lib/itemNotesStore';

interface ItemNotesModalProps {
  itemId: number;
  itemName: string;
  onClose: () => void;
}

export default function ItemNotesModal({ itemId, itemName, onClose }: ItemNotesModalProps) {
  const { addNote, updateNote, getNote } = useItemNotesStore();
  const existingNote = getNote(itemId);
  
  const [note, setNote] = useState(existingNote?.note || '');
  const [tags, setTags] = useState(existingNote?.tags.join(', ') || '');

  const handleSave = () => {
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    
    if (existingNote) {
      updateNote(itemId, { note, tags: tagArray });
    } else {
      addNote({ itemId, itemName, note, tags: tagArray });
    }
    
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-slate-900 border-2 border-osrs-accent/30 rounded-lg max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-slate-100 mb-1">Item Notes</h2>
          <p className="text-slate-400 text-sm mb-6">{itemName}</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Notes
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add your notes about this item..."
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 h-32"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. high-volume, risky, long-term"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
              />
              <p className="text-xs text-slate-500 mt-1">Separate tags with commas</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-3 bg-osrs-accent hover:bg-osrs-accent/90 text-slate-900 font-semibold rounded-lg transition-colors"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
