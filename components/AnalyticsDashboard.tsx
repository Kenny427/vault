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

interface CostBreakdownItem {
    date: string;
    count: number;
    cost: number;
    avgCostPerEvent: number;
}

export default function AnalyticsDashboard() {
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const [popularItems, setPopularItems] = useState<PopularItems | null>(null);
    const [costBreakdown, setCostBreakdown] = useState<CostBreakdownItem[]>([]);
    
    // Filter state
    const [days, setDays] = useState(30);
    const [eventType, setEventType] = useState<string>('');
    const [minCost, setMinCost] = useState<string>('');
    const [maxCost, setMaxCost] = useState<string>('');
    const [eventTypes, setEventTypes] = useState<string[]>([]);

    useEffect(() => {
        loadData();
    }, [days, eventType, minCost, maxCost]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Build query params
            const params = new URLSearchParams();
            params.append('days', days.toString());
            if (eventType) params.append('eventType', eventType);
            if (minCost) params.append('minCost', minCost);
            if (maxCost) params.append('maxCost', maxCost);

            const [overviewRes, itemsRes, costRes] = await Promise.all([
                fetch(`/api/admin/analytics/overview?${params.toString()}`),
                fetch('/api/admin/analytics/popular-items'),
                fetch(`/api/admin/analytics/cost-breakdown?days=${days}&${eventType ? 'eventType=' + eventType : ''}`),
            ]);

            if (overviewRes.ok) {
                const data = await overviewRes.json();
                setOverview(data);
                
                // Extract all event types for dropdown
                if (data.eventBreakdown && Object.keys(data.eventBreakdown).length > 0) {
                    setEventTypes(Object.keys(data.eventBreakdown).sort());
                }
            }

            if (itemsRes.ok) {
                const data = await itemsRes.json();
                setPopularItems(data);
            }

            if (costRes.ok) {
                const data = await costRes.json();
                setCostBreakdown(data);
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
            {/* Filter Controls */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Date Range */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Time Period</label>
                        <select
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 text-sm"
                        >
                            <option value={1}>Last 24 hours</option>
                            <option value={7}>Last 7 days</option>
                            <option value={30}>Last 30 days</option>
                            <option value={90}>Last 90 days</option>
                        </select>
                    </div>

                    {/* Event Type Filter */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Analysis Type</label>
                        <select
                            value={eventType}
                            onChange={(e) => setEventType(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 text-sm"
                        >
                            <option value="">All Types</option>
                            {eventTypes.map((type) => (
                                <option key={type} value={type}>
                                    {type.replace(/_/g, ' ')}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Min Cost */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Min Cost ($)</label>
                        <input
                            type="number"
                            step="0.0001"
                            value={minCost}
                            onChange={(e) => setMinCost(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Max Cost */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Max Cost ($)</label>
                        <input
                            type="number"
                            step="0.0001"
                            value={maxCost}
                            onChange={(e) => setMaxCost(e.target.value)}
                            placeholder="No limit"
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Active Filters Display */}
                {(eventType || minCost || maxCost) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {eventType && (
                            <span className="px-3 py-1 bg-blue-900/30 border border-blue-500/40 rounded-full text-blue-300 text-xs">
                                {eventType} ✕
                            </span>
                        )}
                        {minCost && (
                            <span className="px-3 py-1 bg-green-900/30 border border-green-500/40 rounded-full text-green-300 text-xs">
                                Min ${parseFloat(minCost).toFixed(4)} ✕
                            </span>
                        )}
                        {maxCost && (
                            <span className="px-3 py-1 bg-green-900/30 border border-green-500/40 rounded-full text-green-300 text-xs">
                                Max ${parseFloat(maxCost).toFixed(4)} ✕
                            </span>
                        )}
                        <button
                            onClick={() => {
                                setEventType('');
                                setMinCost('');
                                setMaxCost('');
                            }}
                            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-full text-slate-300 text-xs transition-colors"
                        >
                            Clear All
                        </button>
                    </div>
                )}
            </div>

            {/* Overview Cards */}
            {overview && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                        <div className="text-sm text-slate-400 mb-1">Events Processed</div>
                        <div className="text-3xl font-bold text-slate-100">{overview.totalEvents.toLocaleString()}</div>
                        <div className="text-xs text-slate-500 mt-2">Analysis requests</div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                        <div className="text-sm text-slate-400 mb-1">Total Cost</div>
                        <div className="text-3xl font-bold text-green-400">${overview.totalCost.toFixed(4)}</div>
                        <div className="text-xs text-slate-500 mt-2">OpenAI API costs</div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                        <div className="text-sm text-slate-400 mb-1">Total Tokens</div>
                        <div className="text-3xl font-bold text-blue-400">{overview.totalTokens.toLocaleString()}</div>
                        <div className="text-xs text-slate-500 mt-2">Input + output</div>
                    </div>
                </div>
            )}

            {/* Cost Breakdown Chart */}
            {costBreakdown.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-slate-100 mb-4">Cost Trend</h3>
                    <div className="space-y-2 text-sm">
                        {costBreakdown.slice(-14).map((item) => (
                            <div key={item.date} className="flex items-center gap-4">
                                <div className="w-24 text-slate-400">{item.date}</div>
                                <div className="flex-1">
                                    <div className="bg-slate-700 rounded h-6 overflow-hidden flex items-center px-2">
                                        <div
                                            className="bg-gradient-to-r from-green-500 to-blue-500 h-full flex items-center justify-center text-xs font-semibold text-white transition-all"
                                            style={{
                                                width: `${Math.min((item.cost / (costBreakdown[0]?.cost || 1)) * 100, 100)}%`,
                                            }}
                                        >
                                            {item.cost > 0.001 && `$${item.cost.toFixed(4)}`}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right w-32">
                                    <div className="text-slate-300">${item.cost.toFixed(4)}</div>
                                    <div className="text-slate-500 text-xs">{item.count} events</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Event Breakdown */}
            {overview && Object.keys(overview.eventBreakdown).length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-slate-100 mb-4">Analysis Types</h3>
                    <div className="space-y-2">
                        {Object.entries(overview.eventBreakdown)
                            .sort(([, a], [, b]) => b - a)
                            .map(([event, count]) => (
                                <div key={event} className="flex items-center justify-between">
                                    <span className="text-slate-300">{event.replace(/_/g, ' ')}</span>
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
                            <h3 className="text-lg font-semibold text-slate-100 mb-4">Most Favorited</h3>
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
                            <h3 className="text-lg font-semibold text-slate-100 mb-4">Most Alerted</h3>
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
                            <h3 className="text-lg font-semibold text-slate-100 mb-4">Market Scans</h3>
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
