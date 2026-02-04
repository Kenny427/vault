'use client';

import { useState, useEffect } from 'react';
import { usePriceAlertsStore } from '@/lib/priceAlertsStore';

export default function PriceAlerts() {
  const { alerts, removeAlert } = usePriceAlertsStore();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Notification Permission */}
      {notificationPermission !== 'granted' && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🔔</div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-400 mb-1">Enable Browser Notifications</h3>
              <p className="text-sm text-yellow-200/80 mb-3">
                Allow notifications to get alerted when prices hit your targets
              </p>
              <button
                onClick={requestNotificationPermission}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Enable Notifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-700/50 rounded-lg p-6">
          <p className="text-sm text-blue-400 mb-1">Active Alerts</p>
          <p className="text-3xl font-bold text-blue-400">
            {alerts.filter(a => !a.triggered).length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-700/50 rounded-lg p-6">
          <p className="text-sm text-green-400 mb-1">Triggered</p>
          <p className="text-3xl font-bold text-green-400">
            {alerts.filter(a => a.triggered).length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-700/50 rounded-lg p-6">
          <p className="text-sm text-purple-400 mb-1">Total Alerts</p>
          <p className="text-3xl font-bold text-purple-400">
            {alerts.length}
          </p>
        </div>
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="bg-slate-900 rounded-lg p-12 border border-slate-700 text-center">
          <div className="text-6xl mb-4">⏰</div>
          <h3 className="text-xl font-semibold text-slate-300 mb-2">No price alerts set</h3>
          <p className="text-slate-400">Click &quot;Set Alert&quot; on any item to get notified when prices change</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Active Alerts */}
          {alerts.filter(a => !a.triggered).length > 0 && (
            <>
              <h3 className="text-lg font-semibold text-slate-100">Active Alerts</h3>
              {alerts.filter(a => !a.triggered).map((alert) => (
                <div
                  key={alert.id}
                  className="bg-slate-900 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-100 mb-1">{alert.itemName}</h4>
                      <p className="text-sm text-slate-400">
                        Alert when price goes{' '}
                        <span className={alert.condition === 'above' ? 'text-green-400' : 'text-red-400'}>
                          {alert.condition}
                        </span>{' '}
                        <span className="font-semibold text-slate-300">{alert.targetPrice.toLocaleString()}gp</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Created {formatDate(alert.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeAlert(alert.id)}
                      className="ml-4 text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Triggered Alerts */}
          {alerts.filter(a => a.triggered).length > 0 && (
            <>
              <h3 className="text-lg font-semibold text-slate-100 mt-6">Triggered Alerts</h3>
              {alerts.filter(a => a.triggered).map((alert) => (
                <div
                  key={alert.id}
                  className="bg-slate-900 border border-green-700/50 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-100">{alert.itemName}</h4>
                        <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded">TRIGGERED</span>
                      </div>
                      <p className="text-sm text-slate-400">
                        Price went {alert.condition} {alert.targetPrice.toLocaleString()}gp
                      </p>
                      {alert.notified && (
                        <p className="text-xs text-green-400 mt-1">✓ Notification sent</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeAlert(alert.id)}
                      className="ml-4 text-slate-500 hover:text-slate-400 text-sm"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
