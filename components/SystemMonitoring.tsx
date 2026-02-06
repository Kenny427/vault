'use client';

import { useState, useEffect } from 'react';

interface DatabaseHealth {
    tableCounts: Record<string, number>;
    totalRecords: number;
    recentGrowth: Record<string, number>;
    healthScore: number;
}

interface RateLimit {
    id: string;
    user_id: string;
    daily_limit: number;
    current_usage: number;
    last_reset: string;
}

export default function SystemMonitoring() {
    const [loading, setLoading] = useState(true);
    const [dbHealth, setDbHealth] = useState<DatabaseHealth | null>(null);
    const [rateLimits, setRateLimits] = useState<RateLimit[]>([]);
    const [view, setView] = useState<'database' | 'rate-limits'>('database');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [healthRes, limitsRes] = await Promise.all([
                fetch('/api/admin/database/health'),
                fetch('/api/admin/rate-limits'),
            ]);

            if (healthRes.ok) {
                const data = await healthRes.json();
                setDbHealth(data);
            }

            if (limitsRes.ok) {
                const data = await limitsRes.json();
                setRateLimits(data.limits || []);
            }
        } catch (error) {
            console.error('Error loading monitoring data:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateLimit = async (userId: string, newLimit: number) => {
        try {
            const response = await fetch('/api/admin/rate-limits', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, dailyLimit: newLimit }),
            });

            if (response.ok) {
                await loadData();
                alert('Rate limit updated!');
            } else {
                alert('Failed to update rate limit');
            }
        } catch (error) {
            console.error('Error updating rate limit:', error);
            alert('Error updating rate limit');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-100">⚙️ System Monitoring</h2>
                <button
                    onClick={loadData}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded text-sm transition-colors"
                >
                    🔄 Refresh
                </button>
            </div>

            {/* View Selector */}
            <div className="flex gap-2">
                <button
                    onClick={() => setView('database')}
                    className={`px-4 py-2 rounded transition-colors ${view === 'database'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                >
                    💾 Database Health
                </button>
                <button
                    onClick={() => setView('rate-limits')}
                    className={`px-4 py-2 rounded transition-colors ${view === 'rate-limits'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                >
                    🚦 Rate Limits
                </button>
            </div>

            {/* Database Health View */}
            {view === 'database' && dbHealth && (
                <div className="space-y-6">
                    {/* Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                            <div className="text-sm text-slate-400 mb-1">Total Records</div>
                            <div className="text-3xl font-bold text-slate-100">
                                {dbHealth.totalRecords.toLocaleString()}
                            </div>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                            <div className="text-sm text-slate-400 mb-1">Tables</div>
                            <div className="text-3xl font-bold text-blue-400">
                                {Object.keys(dbHealth.tableCounts).length}
                            </div>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                            <div className="text-sm text-slate-400 mb-1">Health Score</div>
                            <div className="text-3xl font-bold text-green-400">
                                {dbHealth.healthScore}
                            </div>
                        </div>
                    </div>

                    {/* Table Counts */}
                    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-700">
                            <h3 className="font-semibold text-slate-100">Table Statistics</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-900">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Table</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Total Rows</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Added (7 days)</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Growth Rate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {Object.entries(dbHealth.tableCounts)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([table, count]) => {
                                            const growth = dbHealth.recentGrowth[table] || 0;
                                            const growthRate = count > 0 ? (growth / count) * 100 : 0;
                                            return (
                                                <tr key={table} className="hover:bg-slate-700/50">
                                                    <td className="px-4 py-3 text-sm text-slate-300 font-mono">{table}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-400">
                                                        {count.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-400">
                                                        +{growth.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className={growthRate > 10 ? 'text-green-400' : 'text-slate-400'}>
                                                            {growthRate.toFixed(1)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Rate Limits View */}
            {view === 'rate-limits' && (
                <div className="space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                            <div className="text-sm text-slate-400 mb-1">Total Users</div>
                            <div className="text-2xl font-bold text-slate-100">{rateLimits.length}</div>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                            <div className="text-sm text-slate-400 mb-1">At Limit</div>
                            <div className="text-2xl font-bold text-red-400">
                                {rateLimits.filter(l => l.current_usage >= l.daily_limit).length}
                            </div>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                            <div className="text-sm text-slate-400 mb-1">Avg Usage</div>
                            <div className="text-2xl font-bold text-blue-400">
                                {rateLimits.length > 0
                                    ? Math.round(rateLimits.reduce((sum, l) => sum + l.current_usage, 0) / rateLimits.length)
                                    : 0}
                            </div>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                            <div className="text-sm text-slate-400 mb-1">Total Requests</div>
                            <div className="text-2xl font-bold text-green-400">
                                {rateLimits.reduce((sum, l) => sum + l.current_usage, 0).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* Rate Limits Table */}
                    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-700">
                            <h3 className="font-semibold text-slate-100">User Rate Limits</h3>
                        </div>
                        {rateLimits.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">No rate limits configured</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-900">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">User ID</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Current Usage</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Daily Limit</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Usage %</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Last Reset</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {rateLimits.map((limit) => {
                                            const usagePercent = (limit.current_usage / limit.daily_limit) * 100;
                                            return (
                                                <tr key={limit.id} className="hover:bg-slate-700/50">
                                                    <td className="px-4 py-3 text-sm text-slate-300 font-mono">
                                                        {limit.user_id.slice(0, 8)}...
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-400">
                                                        {limit.current_usage}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-400">
                                                        {limit.daily_limit}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 bg-slate-700 rounded-full h-2 max-w-[100px]">
                                                                <div
                                                                    className={`h-2 rounded-full ${usagePercent >= 100
                                                                            ? 'bg-red-500'
                                                                            : usagePercent >= 80
                                                                                ? 'bg-yellow-500'
                                                                                : 'bg-green-500'
                                                                        }`}
                                                                    style={{ width: `${Math.min(100, usagePercent)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-slate-400">{usagePercent.toFixed(0)}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-400">
                                                        {new Date(limit.last_reset).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <button
                                                            onClick={() => {
                                                                const newLimit = prompt('Enter new daily limit:', limit.daily_limit.toString());
                                                                if (newLimit) {
                                                                    updateLimit(limit.user_id, parseInt(newLimit));
                                                                }
                                                            }}
                                                            className="text-blue-400 hover:text-blue-300"
                                                        >
                                                            Edit
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
