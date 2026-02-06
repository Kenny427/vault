'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PoolManager from '@/components/PoolManager';
import PoolManagementPanel from '@/components/PoolManagementPanel';
import UserManagement from '@/components/UserManagement';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import ErrorLogViewer from '@/components/ErrorLogViewer';
import BroadcastNotifications from '@/components/BroadcastNotifications';
import PoolInsights from '@/components/PoolInsights';
import ManualPoolEditor from '@/components/ManualPoolEditor';
import SystemMonitoring from '@/components/SystemMonitoring';

type Tab = 'insights' | 'pool-editor' | 'analytics' | 'pool-manager' | 'pool-stats' | 'users' | 'errors' | 'notifications' | 'monitoring';

const ADMIN_EMAIL = 'kenstorholt@gmail.com';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('insights');
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      // Local development bypass
      if (process.env.NODE_ENV !== 'production') {
        setIsAuthorized(true);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email;

      const authorized = userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      setIsAuthorized(authorized);

      if (!authorized) {
        // Redirect to home page after a brief delay
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    };

    checkAccess();
  }, [router]);

  // Loading state
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Unauthorized state
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-4">
            You don&apos;t have permission to access the admin panel.
          </p>
          <p className="text-sm text-slate-500">
            Redirecting to home page...
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'insights' as Tab, label: '💡 Pool Insights', description: 'Performance & optimization' },
    { id: 'pool-editor' as Tab, label: '✏️ Pool Editor', description: 'Manage items' },
    { id: 'analytics' as Tab, label: '📊 Analytics', description: 'System metrics' },
    { id: 'users' as Tab, label: '👥 Users', description: 'User management' },
    { id: 'notifications' as Tab, label: '📢 Notifications', description: 'Broadcasts' },
    { id: 'monitoring' as Tab, label: '⚙️ Monitoring', description: 'DB & rate limits' },
    { id: 'errors' as Tab, label: '🐛 Errors', description: 'Error logs' },
    { id: 'pool-manager' as Tab, label: '🎯 Legacy Pool', description: 'Old pool manager' },
    { id: 'pool-stats' as Tab, label: '📈 Stats', description: 'Filter stats' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-slate-400">
            Comprehensive management dashboard for your OSRS flipping tool
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-slate-700 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium transition-colors relative whitespace-nowrap ${activeTab === tab.id
                  ? 'text-blue-400 bg-slate-900'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm">{tab.label}</span>
                  <span className="text-xs opacity-70">{tab.description}</span>
                </div>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
          {activeTab === 'insights' && <PoolInsights />}
          {activeTab === 'pool-editor' && <ManualPoolEditor />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'notifications' && <BroadcastNotifications />}
          {activeTab === 'monitoring' && <SystemMonitoring />}
          {activeTab === 'errors' && <ErrorLogViewer />}
          {activeTab === 'pool-manager' && <PoolManager />}
          {activeTab === 'pool-stats' && <PoolManagementPanel />}
        </div>
      </div>
    </div>
  );
}
