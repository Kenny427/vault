'use client';

import { useState, useEffect } from 'react';

interface ItemPerformance {
    id: string;
    item_id: number;
    item_name: string;
    times_analyzed: number;
    times_approved: number;
    times_rejected: number;
    total_roi_potential: number;
    avg_confidence_score: number;
    success_rate: number;
    last_analyzed_at: string | null;
    last_approved_at: string | null;
}

interface PoolRecommendations {
    underperformers: ItemPerformance[];
    topPerformers: ItemPerformance[];
    staleItems: ItemPerformance[];
    poolHealth: {
        totalItems: number;
        avgSuccessRate: number;
        healthScore: number;
    };
}

export default function PoolInsights() {
    const [loading, setLoading] = useState(true);
    const [performance, setPerformance] = useState<ItemPerformance[]>([]);
    const [recommendations, setRecommendations] = useState<PoolRecommendations | null>(null);
    const [view, setView] = useState<'overview' | 'all' | 'top' | 'underperform' | 'stale'>('overview');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/pool/insights');
            if (response.ok) {
                const data = await response.json();
                setPerformance(data.performance || []);
                setRecommendations(data.recommendations);
            }
        } catch (error) {
            console.error('Error loading pool insights:', error);
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

    const getSuccessColor = (rate: number) => {
        if (rate >= 70) return 'text-green-400';
        if (rate >= 40) return 'text-yellow-400';
        return 'text-red-400';
    };

    const renderItemTable = (items: ItemPerformance[], title: string, emptyMessage: string) => (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
                <h3 className="font-semibold text-slate-100">{title}</h3>
            </div>
            {items.length === 0 ? (
                <div className="p-8 text-center text-slate-400">{emptyMessage}</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-900">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Item</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Analyzed</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Approved</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Success Rate</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Avg Confidence</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Last Analyzed</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-700/50">
                                    <td className="px-4 py-3 text-sm text-slate-300">{item.item_name}</td>
                                    <td className="px-4 py-3 text-sm text-slate-400">{item.times_analyzed}</td>
                                    <td className="px-4 py-3 text-sm text-slate-400">
                                        {item.times_approved} / {item.times_rejected} rejected
                                    </td>
                                    <td className={`px-4 py-3 text-sm font-semibold ${getSuccessColor(item.success_rate)}`}>
                                        {item.success_rate.toFixed(1)}%
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-400">
                                        {item.avg_confidence_score.toFixed(1)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-400">
                                        {item.last_analyzed_at
                                            ? new Date(item.last_analyzed_at).toLocaleDateString()
                                            : 'Never'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-100">💡 Pool Insights & Optimization</h2>
                <button
                    onClick={loadData}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded text-sm transition-colors"
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Pool Health Score */}
            {recommendations && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700 rounded-lg p-6">
                        <div className="text-sm text-blue-300 mb-1">Pool Health Score</div>
                        <div className="text-3xl font-bold text-blue-100">
                            {recommendations.poolHealth.healthScore.toFixed(0)}
                        </div>
                        <div className="text-xs text-blue-400 mt-1">Out of 100</div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                        <div className="text-sm text-slate-400 mb-1">Total Items Tracked</div>
                        <div className="text-3xl font-bold text-slate-100">
                            {recommendations.poolHealth.totalItems}
                        </div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                        <div className="text-sm text-slate-400 mb-1">Avg Success Rate</div>
                        <div className={`text-3xl font-bold ${getSuccessColor(recommendations.poolHealth.avgSuccessRate)}`}>
                            {recommendations.poolHealth.avgSuccessRate.toFixed(1)}%
                        </div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                        <div className="text-sm text-slate-400 mb-1">Items to Review</div>
                        <div className="text-3xl font-bold text-orange-400">
                            {recommendations.underperformers.length + recommendations.staleItems.length}
                        </div>
                    </div>
                </div>
            )}

            {/* View Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                    { id: 'overview', label: '📊 Overview', count: null },
                    { id: 'top', label: '⭐ Top Performers', count: recommendations?.topPerformers.length },
                    { id: 'underperform', label: '⚠️ Underperformers', count: recommendations?.underperformers.length },
                    { id: 'stale', label: '🕐 Stale Items', count: recommendations?.staleItems.length },
                    { id: 'all', label: '📋 All Items', count: performance.length },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setView(tab.id as any)}
                        className={`px-4 py-2 rounded whitespace-nowrap transition-colors ${view === tab.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                    >
                        {tab.label}
                        {tab.count !== null && tab.count !== undefined && (
                            <span className="ml-2 px-2 py-0.5 bg-slate-900/50 rounded text-xs">
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            {view === 'overview' && recommendations && (
                <div className="space-y-6">
                    {/* Action Items */}
                    {(recommendations.underperformers.length > 0 || recommendations.staleItems.length > 0) && (
                        <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-orange-300 mb-4">🎯 Recommended Actions</h3>
                            <div className="space-y-3">
                                {recommendations.underperformers.length > 0 && (
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">⚠️</span>
                                        <div>
                                            <div className="font-medium text-slate-100">
                                                {recommendations.underperformers.length} underperforming items
                                            </div>
                                            <div className="text-sm text-slate-400">
                                                Consider removing items with low success rates to improve pool quality
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {recommendations.staleItems.length > 0 && (
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">🕐</span>
                                        <div>
                                            <div className="font-medium text-slate-100">
                                                {recommendations.staleItems.length} stale items
                                            </div>
                                            <div className="text-sm text-slate-400">
                                                Items not analyzed in 30+ days - may need refresh or removal
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Top Performers Preview */}
                    {recommendations.topPerformers.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-slate-100">⭐ Top Performers</h3>
                                <button
                                    onClick={() => setView('top')}
                                    className="text-sm text-blue-400 hover:text-blue-300"
                                >
                                    View All →
                                </button>
                            </div>
                            {renderItemTable(
                                recommendations.topPerformers.slice(0, 5),
                                '',
                                ''
                            )}
                        </div>
                    )}
                </div>
            )}

            {view === 'top' && recommendations && renderItemTable(
                recommendations.topPerformers,
                'Top Performing Items',
                'No top performers yet'
            )}

            {view === 'underperform' && recommendations && renderItemTable(
                recommendations.underperformers,
                'Underperforming Items (Consider Removing)',
                'No underperformers - great job!'
            )}

            {view === 'stale' && recommendations && renderItemTable(
                recommendations.staleItems,
                'Stale Items (Not Analyzed Recently)',
                'No stale items'
            )}

            {view === 'all' && renderItemTable(
                performance,
                'All Items Performance',
                'No items tracked yet'
            )}
        </div>
    );
}
