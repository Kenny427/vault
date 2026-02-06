'use client';

import { useState, useEffect } from 'react';

interface UserNotification {
    id: string;
    notification_id: string;
    read: boolean;
    notification: {
        id: string;
        title: string;
        message: string;
        type: 'info' | 'warning' | 'success' | 'error';
        created_at: string;
    };
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        loadNotifications();

        // Poll for new notifications every 30 seconds
        const interval = setInterval(loadNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadNotifications = async () => {
        try {
            const response = await fetch('/api/notifications');
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications || []);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    };

    const markAsRead = async (notificationId: string) => {
        try {
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'POST',
            });

            if (response.ok) {
                // Update local state
                setNotifications(prev =>
                    prev.map(n =>
                        n.notification_id === notificationId
                            ? { ...n, read: true }
                            : n
                    )
                );
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const typeIcons = {
        info: 'ℹ️',
        warning: '⚠️',
        success: '✅',
        error: '❌',
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"
            >
                🔔
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {showDropdown && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDropdown(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-96 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-100">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="text-xs text-slate-400">{unreadCount} unread</span>
                            )}
                        </div>

                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                No notifications
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-700">
                                {notifications.map((userNotif) => {
                                    const notif = userNotif.notification;
                                    return (
                                        <div
                                            key={userNotif.id}
                                            className={`p-4 hover:bg-slate-700/50 cursor-pointer ${!userNotif.read ? 'bg-slate-700/30' : ''
                                                }`}
                                            onClick={() => {
                                                if (!userNotif.read) {
                                                    markAsRead(userNotif.notification_id);
                                                }
                                            }}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="text-xl">{typeIcons[notif.type]}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-semibold text-slate-100 text-sm truncate">
                                                            {notif.title}
                                                        </h4>
                                                        {!userNotif.read && (
                                                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                                        )}
                                                    </div>
                                                    <p className="text-slate-300 text-xs mb-1">{notif.message}</p>
                                                    <span className="text-xs text-slate-500">
                                                        {new Date(notif.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
