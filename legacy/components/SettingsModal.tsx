'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabase';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { session } = useAuth();
  const [rsnList, setRsnList] = useState<string[]>([]);
  const [newRsn, setNewRsn] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Load all RSN accounts
  useEffect(() => {
    if (!session?.user?.id) return;

    const loadRsns = async () => {
      const { data, error } = await supabase
        .from('user_rsn_accounts')
        .select('rsn')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setRsnList(data.map((item: any) => item.rsn));
      }
      setLoading(false);
    };

    loadRsns();
  }, [session?.user?.id]);

  const handleAddRsn = async () => {
    if (!session?.user?.id || !newRsn.trim()) return;
    
    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('user_rsn_accounts')
        .insert({
          user_id: session.user.id,
          rsn: newRsn.trim(),
        });

      if (error) {
        if (error.message.includes('duplicate')) {
          setMessage('This RuneScape account is already added');
        } else {
          setMessage(`Error: ${error.message}`);
        }
      } else {
        setRsnList([...rsnList, newRsn.trim()]);
        setNewRsn('');
        setMessage('✓ RuneScape account added!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRsn = async (rsnToRemove: string) => {
    if (!session?.user?.id) return;
    
    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('user_rsn_accounts')
        .delete()
        .eq('user_id', session.user.id)
        .eq('rsn', rsnToRemove);

      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setRsnList(rsnList.filter(r => r !== rsnToRemove));
        setMessage('✓ RuneScape account removed!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg border border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-900">
          <h2 className="text-xl font-bold text-slate-100">Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Account Info */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Account</h3>
            <p className="text-slate-400 text-sm">{session?.user?.email}</p>
          </div>

          {/* RuneScape Accounts */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">RuneScape Accounts</h3>
            <p className="text-slate-400 text-xs mb-4">
              Add all your RuneScape accounts to track DINK transactions for each.
            </p>

            {/* Add New RSN */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newRsn}
                onChange={(e) => setNewRsn(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddRsn()}
                placeholder="Add account name"
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-osrs-accent text-sm"
                disabled={saving}
              />
              <button
                onClick={handleAddRsn}
                disabled={saving || !newRsn.trim()}
                className="px-3 py-2 bg-osrs-accent hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-slate-900 font-medium transition-colors text-sm"
              >
                Add
              </button>
            </div>

            {/* RSN List */}
            <div className="space-y-2">
              {loading ? (
                <p className="text-slate-400 text-sm">Loading accounts...</p>
              ) : rsnList.length === 0 ? (
                <p className="text-slate-400 text-sm">No accounts added yet</p>
              ) : (
                rsnList.map((rsn) => (
                  <div
                    key={rsn}
                    className="flex items-center justify-between p-2 bg-slate-800 rounded border border-slate-700"
                  >
                    <span className="text-slate-100 text-sm">{rsn}</span>
                    <button
                      onClick={() => handleRemoveRsn(rsn)}
                      disabled={saving}
                      className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed rounded text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Message */}
            {message && (
              <div
                className={`mt-4 p-3 rounded text-sm ${
                  message.includes('✓')
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : message.includes('Error')
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}
              >
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
