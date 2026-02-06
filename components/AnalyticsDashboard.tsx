'use client';

import { useState, useEffect } from 'react';

interface AnalyticsOverview {
    totalEvents: number;
    totalCost: number;
    totalTokens: number;
    eventBreakdown: Record<string, number>;
    topUsers: { userId: string; count: number }[];
}

interface PopularItems {
    mostFavorited: { itemId: number; itemName: string; count: number }[];
    mostAlerted: { itemId: number; itemName: string; count: number }[];
    mostAnalyzed: { itemId: number; itemName: string; count: number }[];
}

export default function AnalyticsDashboard() {
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const [popularItems, setPopularItems] = useState<PopularItems | null>(null);
    const [days, setDays] = useState(30);

    useEffect(() => {
        loadData();
    }, [days]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [overviewRes, itemsRes] = await Promise.all([
                fetch(`/api/admin/analytics/overview?days=${days}`),
                fetch('/api/admin/analytics/popular-items'),
            ]);

            if (overviewRes.ok) {
                const data = await overviewRes.json();
                setOverview(data);
            }

            if (itemsRes.ok) {
                const data = await itemsRes.json();
                setPopularItems(data);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
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
            {/* Time Range Selector */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-100">📊 System Analytics</h2>
                <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm"
                >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                </select>
            </div>

            {/* Overview Cards */}
            {overview && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                        <div className="text-sm text-slate-400 mb-1">Total Events</div>
                        <div className="text-3xl font-bold text-slate-100">{overview.totalEvents.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                        <div className="text-sm text-slate-400 mb-1">Total Cost</div>
                        <div className="text-3xl font-bold text-green-400">${overview.totalCost.toFixed(4)}</div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                        <div className="text-sm text-slate-400 mb-1">Total Tokens</div>
                        <div className="text-3xl font-bold text-blue-400">{overview.totalTokens.toLocaleString()}</div>
                    </div>
                </div>
            )}

            {/* Event Breakdown */}
            {overview && Object.keys(overview.eventBreakdown).length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-slate-100 mb-4">Event Breakdown</h3>
                    <div className="space-y-2">
                        {Object.entries(overview.eventBreakdown)
                            .sort(([, a], [, b]) => b - a)
                            .map(([event, count]) => (
                                <div key={event} className="flex items-center justify-between">
                                    <span className="text-slate-300">{event}</span>
                                    <span className="text-slate-400">{count.toLocaleString()}</span>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Top Users */}
            {overview && overview.topUsers.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-slate-100 mb-4">Most Active Users</h3>
                    <div className="space-y-2">
                        {overview.topUsers.map((user, idx) => (
                            <div key={user.userId} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500">#{idx + 1}</span>
                                    <span className="text-slate-300 font-mono text-sm">{user.userId.slice(0, 8)}...</span>
                                </div>
                                <span className="text-slate-400">{user.count} events</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Popular Items */}
            {popularItems && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Most Favorited */}
                    {popularItems.mostFavorited.length > 0 && (
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-slate-100 mb-4">⭐ Most Favorited</h3>
                            <div className="space-y-2">
                                {popularItems.mostFavorited.slice(0, 5).map((item) => (
                                    <div key={item.itemId} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-300 truncate">{item.itemName}</span>
                                        <span className="text-slate-400 ml-2">{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Most Alerted */}
                    {popularItems.mostAlerted.length > 0 && (
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-slate-100 mb-4">🔔 Most Alerted</h3>
                            <div className="space-y-2">
                                {popularItems.mostAlerted.slice(0, 5).map((item) => (
                                    <div key={item.itemId} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-300 truncate">{item.itemName}</span>
                                        <span className="text-slate-400 ml-2">{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Most Analyzed */}
                    {popularItems.mostAnalyzed.length > 0 && (
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-slate-100 mb-4">🤖 Most Analyzed</h3>
                            <div className="space-y-2">
                                {popularItems.mostAnalyzed.slice(0, 5).map((item) => (
                                    <div key={item.itemId} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-300 truncate">{item.itemName}</span>
                                        <span className="text-slate-400 ml-2">{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
