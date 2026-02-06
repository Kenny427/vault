'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAdmin } from '@/lib/adminAuth';
import PoolManager from '@/components/PoolManager';
import PoolManagementPanel from '@/components/PoolManagementPanel';
import UserManagement from '@/components/UserManagement';

type Tab = 'pool-manager' | 'pool-stats' | 'users';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('pool-manager');
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      const authorized = await isAdmin();
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
            You don't have permission to access the admin panel.
          </p>
          <p className="text-sm text-slate-500">
            Redirecting to home page...
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'pool-manager' as Tab, label: '🎯 Pool Manager', description: 'Manage item pool' },
    { id: 'pool-stats' as Tab, label: '📊 Pool Stats', description: 'Filter statistics' },
    { id: 'users' as Tab, label: '👥 User Management', description: 'Manage users' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-slate-400">
            Manage your OSRS flipping tool: item pool, statistics, and users
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-slate-700">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium transition-colors relative ${activeTab === tab.id
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
          {activeTab === 'pool-manager' && <PoolManager />}
          {activeTab === 'pool-stats' && <PoolManagementPanel />}
          {activeTab === 'users' && <UserManagement />}
        </div>
      </div>
    </div>
  );
}
