'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabase';

export function SettingsPage() {
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
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex items-center justify-center">
        <p className="text-slate-400">Please log in to access settings</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="bg-slate-900 rounded-lg p-6 space-y-8">
          {/* Account Info */}
          <div className="border-b border-slate-700 pb-6">
            <h2 className="text-xl font-semibold mb-4">Account</h2>
            <div className="space-y-2">
              <p className="text-slate-400">Email</p>
              <p className="text-slate-100">{session.user.email}</p>
            </div>
          </div>

          {/* RuneScape Accounts */}
          <div>
            <h2 className="text-xl font-semibold mb-4">RuneScape Accounts</h2>
            <p className="text-slate-400 text-sm mb-4">
              Add all your RuneScape account names to track DINK transactions for multiple accounts.
            </p>

            {/* Add New RSN Form */}
            <div className="mb-6 p-4 bg-slate-800 rounded-lg">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Add New RuneScape Account
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRsn}
                  onChange={(e) => setNewRsn(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddRsn()}
                  placeholder="e.g., Zezima"
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                />
                <button
                  onClick={handleAddRsn}
                  disabled={saving || !newRsn.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white font-medium transition-colors"
                >
                  {saving ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>

            {/* List of RSN Accounts */}
            <div className="space-y-2">
              {rsnList.length === 0 ? (
                <p className="text-slate-400 text-sm">No RuneScape accounts added yet</p>
              ) : (
                rsnList.map((rsn) => (
                  <div
                    key={rsn}
                    className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700"
                  >
                    <span className="text-slate-100 font-medium">{rsn}</span>
                    <button
                      onClick={() => handleRemoveRsn(rsn)}
                      disabled={saving}
                      className="px-3 py-1 text-sm bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed rounded text-red-400 transition-colors"
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
