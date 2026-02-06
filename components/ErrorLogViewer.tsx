'use client';

import { useState, useEffect } from 'react';

interface ErrorLog {
    id: string;
    user_id: string | null;
    error_type: string;
    error_message: string;
    stack_trace: string | null;
    url: string | null;
    user_agent: string | null;
    metadata: Record<string, any>;
    created_at: string;
}

export default function ErrorLogViewer() {
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState<ErrorLog[]>([]);
    const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        loadErrors();
    }, []);

    const loadErrors = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/errors?limit=100');
            if (response.ok) {
                const data = await response.json();
                setErrors(data.errors || []);
            }
        } catch (error) {
            console.error('Error loading errors:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredErrors = errors.filter(error =>
        error.error_message.toLowerCase().includes(filter.toLowerCase()) ||
        error.error_type.toLowerCase().includes(filter.toLowerCase())
    );

    const errorTypeCounts = errors.reduce((acc, error) => {
        acc[error.error_type] = (acc[error.error_type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-100">🐛 Error Logs</h2>
                <button
                    onClick={loadErrors}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded text-sm transition-colors"
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Error Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Total Errors</div>
                    <div className="text-2xl font-bold text-red-400">{errors.length}</div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Error Types</div>
                    <div className="text-2xl font-bold text-orange-400">{Object.keys(errorTypeCounts).length}</div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Last 24h</div>
                    <div className="text-2xl font-bold text-yellow-400">
                        {errors.filter(e => new Date(e.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length}
                    </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Most Common</div>
                    <div className="text-sm font-semibold text-slate-100 truncate">
                        {Object.entries(errorTypeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'}
                    </div>
                </div>
            </div>

            {/* Search */}
            <input
                type="text"
                placeholder="Filter by error message or type..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500"
            />

            {/* Error List */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                    {filteredErrors.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            {filter ? 'No errors match your filter' : 'No errors logged'}
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-900 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Time</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Message</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">User</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {filteredErrors.map((error) => (
                                    <tr key={error.id} className="hover:bg-slate-700/50">
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            {new Date(error.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className="px-2 py-1 bg-red-900/50 text-red-300 rounded text-xs">
                                                {error.error_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300 max-w-md truncate">
                                            {error.error_message}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400 font-mono">
                                            {error.user_id ? error.user_id.slice(0, 8) + '...' : 'Anonymous'}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <button
                                                onClick={() => setSelectedError(error)}
                                                className="text-blue-400 hover:text-blue-300"
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
            </div>

            {/* Error Detail Modal */}
            {selectedError && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-100">Error Details</h3>
                            <button
                                onClick={() => setSelectedError(null)}
                                className="text-slate-400 hover:text-slate-300"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <div className="text-sm text-slate-400 mb-1">Type</div>
                                <div className="text-slate-100">{selectedError.error_type}</div>
                            </div>
                            <div>
                                <div className="text-sm text-slate-400 mb-1">Message</div>
                                <div className="text-slate-100">{selectedError.error_message}</div>
                            </div>
                            <div>
                                <div className="text-sm text-slate-400 mb-1">Time</div>
                                <div className="text-slate-100">{new Date(selectedError.created_at).toLocaleString()}</div>
                            </div>
                            {selectedError.url && (
                                <div>
                                    <div className="text-sm text-slate-400 mb-1">URL</div>
                                    <div className="text-slate-100 text-sm break-all">{selectedError.url}</div>
                                </div>
                            )}
                            {selectedError.stack_trace && (
                                <div>
                                    <div className="text-sm text-slate-400 mb-1">Stack Trace</div>
                                    <pre className="bg-slate-900 p-4 rounded text-xs text-slate-300 overflow-x-auto">
                                        {selectedError.stack_trace}
                                    </pre>
                                </div>
                            )}
                            {selectedError.user_agent && (
                                <div>
                                    <div className="text-sm text-slate-400 mb-1">User Agent</div>
                                    <div className="text-slate-100 text-sm">{selectedError.user_agent}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
