'use client';

import { useState, useEffect } from 'react';

interface AutoRefreshSettingsProps {
  onIntervalChange: (interval: number) => void;
  currentInterval?: number;
}

export default function AutoRefreshSettings({ onIntervalChange, currentInterval = 0 }: AutoRefreshSettingsProps) {
  const [interval, setInterval] = useState(currentInterval);
  const [enabled, setEnabled] = useState(currentInterval > 0);

  useEffect(() => {
    if (enabled && interval > 0) {
      onIntervalChange(interval);
    } else {
      onIntervalChange(0);
    }
  }, [enabled, interval, onIntervalChange]);

  const presets = [
    { label: '30 seconds', value: 30000 },
    { label: '1 minute', value: 60000 },
    { label: '5 minutes', value: 300000 },
    { label: '15 minutes', value: 900000 },
  ];

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">🔄 Auto-Refresh Settings</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Enable Auto-Refresh</span>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? 'bg-osrs-accent' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {enabled && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Refresh Interval
              </label>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setInterval(preset.value)}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      interval === preset.value
                        ? 'bg-osrs-accent text-slate-900 font-semibold'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-700/50 rounded p-3">
              <p className="text-sm text-blue-300">
                Data will refresh every {interval / 1000} seconds
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
