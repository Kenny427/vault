'use client';

import { useState, useEffect } from 'react';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    target_users: string;
    created_at: string;
    expires_at: string | null;
}

export default function BroadcastNotifications() {
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'info' | 'warning' | 'success' | 'error'>('info');
    const [targetUsers, setTargetUsers] = useState<'all' | 'active'>('all');

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            const response = await fetch('/api/admin/notifications');
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications || []);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/admin/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    message,
                    type,
                    targetUsers,
                }),
            });

            if (response.ok) {
                // Reset form
                setTitle('');
                setMessage('');
                setType('info');
                setTargetUsers('all');
                setShowForm(false);

                // Reload notifications
                await loadNotifications();

                alert('Notification sent successfully!');
            } else {
                alert('Failed to send notification');
            }
        } catch (error) {
            console.error('Error sending notification:', error);
            alert('Error sending notification');
        } finally {
            setLoading(false);
        }
    };

    const typeColors = {
        info: 'bg-blue-900/50 text-blue-300 border-blue-700',
        warning: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
        success: 'bg-green-900/50 text-green-300 border-green-700',
        error: 'bg-red-900/50 text-red-300 border-red-700',
    };

    const typeIcons = {
        info: 'ℹ️',
        warning: '⚠️',
        success: '✅',
        error: '❌',
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-100">📢 Broadcast Notifications</h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                >
                    {showForm ? 'Cancel' : '+ New Broadcast'}
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded text-slate-100"
                            placeholder="Notification title"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Message
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                            rows={4}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded text-slate-100"
                            placeholder="Notification message"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Type
                            </label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as any)}
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded text-slate-100"
                            >
                                <option value="info">Info</option>
                                <option value="success">Success</option>
                                <option value="warning">Warning</option>
                                <option value="error">Error</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Target
                            </label>
                            <select
                                value={targetUsers}
                                onChange={(e) => setTargetUsers(e.target.value as any)}
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded text-slate-100"
                            >
                                <option value="all">All Users</option>
                                <option value="active">Active Users (30 days)</option>
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded font-medium transition-colors"
                    >
                        {loading ? 'Sending...' : 'Send Broadcast'}
                    </button>
                </form>
            )}

            {/* Notifications List */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700">
                    <h3 className="font-semibold text-slate-100">Recent Broadcasts</h3>
                </div>
                <div className="divide-y divide-slate-700">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            No broadcasts sent yet
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <div key={notification.id} className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="text-2xl">{typeIcons[notification.type]}</div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h4 className="font-semibold text-slate-100">{notification.title}</h4>
                                            <span className={`px-2 py-1 rounded text-xs ${typeColors[notification.type]}`}>
                                                {notification.type}
                                            </span>
                                        </div>
                                        <p className="text-slate-300 text-sm mb-2">{notification.message}</p>
                                        <div className="flex items-center gap-4 text-xs text-slate-400">
                                            <span>Target: {notification.target_users}</span>
                                            <span>•</span>
                                            <span>{new Date(notification.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
