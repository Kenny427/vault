'use client';

import { useState, useEffect } from 'react';

interface UserWithStats {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string;
    rsn_count: number;
    favorites_count: number;
    portfolio_count: number;
    notes_count: number;
    alerts_count: number;
}

interface UserRSNAccount {
    rsn: string;
    created_at: string;
}

interface UserDetailedStats {
    user_id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string;
    rsn_accounts: UserRSNAccount[];
    favorites_count: number;
    portfolio_count: number;
    notes_count: number;
    alerts_count: number;
    transactions_count: number;
}

interface AggregatedStats {
    total_users: number;
    active_users_30d: number;
    total_rsn_accounts: number;
    total_favorites: number;
    total_portfolio_items: number;
    total_notes: number;
    total_alerts: number;
}

export default function UserManagement() {
    const [users, setUsers] = useState<UserWithStats[]>([]);
    const [stats, setStats] = useState<AggregatedStats | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserDetailedStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'email' | 'created' | 'activity'>('created');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/users');
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();
            setUsers(data.users);
            setStats(data.stats);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadUserDetails = async (userId: string) => {
        setLoadingDetails(true);
        try {
            const response = await fetch(`/api/admin/users/${userId}`);
            if (!response.ok) throw new Error('Failed to fetch user details');
            const data = await response.json();
            setSelectedUser(data);
        } catch (error) {
            console.error('Error loading user details:', error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        switch (sortBy) {
            case 'email':
                return a.email.localeCompare(b.email);
            case 'created':
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            case 'activity':
                return new Date(b.last_sign_in_at).getTime() - new Date(a.last_sign_in_at).getTime();
            default:
                return 0;
        }
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Summary */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                        <p className="text-xs text-slate-400 uppercase font-semibold">Total Users</p>
                        <p className="text-2xl font-bold text-blue-400 mt-1">{stats.total_users}</p>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                        <p className="text-xs text-slate-400 uppercase font-semibold">Active (30d)</p>
                        <p className="text-2xl font-bold text-green-400 mt-1">{stats.active_users_30d}</p>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                        <p className="text-xs text-slate-400 uppercase font-semibold">Total RSNs</p>
                        <p className="text-2xl font-bold text-purple-400 mt-1">{stats.total_rsn_accounts}</p>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                        <p className="text-xs text-slate-400 uppercase font-semibold">Total Data</p>
                        <p className="text-2xl font-bold text-osrs-accent mt-1">
                            {stats.total_favorites + stats.total_portfolio_items + stats.total_notes + stats.total_alerts}
                        </p>
                    </div>
                </div>
            )}

            {/* Search and Sort */}
            <div className="flex gap-4">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by email or user ID..."
                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-4 py-2 bg-slate-800 border border-slate-600 rounded text-slate-100 focus:outline-none focus:border-blue-500"
                >
                    <option value="created">Newest First</option>
                    <option value="activity">Most Active</option>
                    <option value="email">Email A-Z</option>
                </select>
            </div>

            {/* Users Table */}
            <div className="border border-slate-700 rounded-lg overflow-hidden">
                {sortedUsers.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                        <p>No users found</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-slate-800 border-b border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Email</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">RSNs</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">Favorites</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">Portfolio</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">Notes</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">Alerts</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">Joined</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {sortedUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3 text-sm">
                                        <div className="text-slate-200 font-medium">{user.email}</div>
                                        <div className="text-xs text-slate-500 font-mono">{user.id.slice(0, 8)}...</div>
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm">
                                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded ${user.rsn_count > 0 ? 'bg-purple-600/20 text-purple-300' : 'bg-slate-700 text-slate-400'
                                            }`}>
                                            {user.rsn_count}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-slate-400">{user.favorites_count}</td>
                                    <td className="px-4 py-3 text-center text-sm text-slate-400">{user.portfolio_count}</td>
                                    <td className="px-4 py-3 text-center text-sm text-slate-400">{user.notes_count}</td>
                                    <td className="px-4 py-3 text-center text-sm text-slate-400">{user.alerts_count}</td>
                                    <td className="px-4 py-3 text-right text-sm text-slate-500">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => loadUserDetails(user.id)}
                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-medium transition-colors"
                                        >
                                            Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* User Details Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-100">User Details</h3>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="text-slate-400 hover:text-slate-200 text-2xl leading-none"
                            >
                                ×
                            </button>
                        </div>

                        {loadingDetails ? (
                            <div className="p-8 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        ) : (
                            <div className="p-6 space-y-6">
                                {/* Basic Info */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-300 mb-3">Account Information</h4>
                                    <div className="bg-slate-800/50 rounded-lg p-4 space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Email:</span>
                                            <span className="text-slate-200 font-medium">{selectedUser.email}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">User ID:</span>
                                            <span className="text-slate-500 font-mono text-xs">{selectedUser.user_id}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Joined:</span>
                                            <span className="text-slate-200">{new Date(selectedUser.created_at).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Last Sign In:</span>
                                            <span className="text-slate-200">{new Date(selectedUser.last_sign_in_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* RSN Accounts */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-300 mb-3">
                                        RuneScape Accounts ({selectedUser.rsn_accounts.length})
                                    </h4>
                                    {selectedUser.rsn_accounts.length === 0 ? (
                                        <p className="text-sm text-slate-500 italic">No RSN accounts added</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {selectedUser.rsn_accounts.map((account, idx) => (
                                                <div key={idx} className="bg-slate-800/50 rounded-lg p-3 flex justify-between items-center">
                                                    <span className="text-slate-200 font-medium">{account.rsn}</span>
                                                    <span className="text-xs text-slate-500">
                                                        Added {new Date(account.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Data Summary */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-300 mb-3">Data Summary</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-800/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-400">Favorites</p>
                                            <p className="text-xl font-bold text-blue-400 mt-1">{selectedUser.favorites_count}</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-400">Portfolio Items</p>
                                            <p className="text-xl font-bold text-green-400 mt-1">{selectedUser.portfolio_count}</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-400">Notes</p>
                                            <p className="text-xl font-bold text-purple-400 mt-1">{selectedUser.notes_count}</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-400">Price Alerts</p>
                                            <p className="text-xl font-bold text-osrs-accent mt-1">{selectedUser.alerts_count}</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-3 col-span-2">
                                            <p className="text-xs text-slate-400">Pending Transactions</p>
                                            <p className="text-xl font-bold text-orange-400 mt-1">{selectedUser.transactions_count}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
