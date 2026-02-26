'use client';

export default function SkeletonLoader({ type = 'card' }: { type?: 'card' | 'table' | 'list' }) {
  if (type === 'card') {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 animate-pulse">
        <div className="flex justify-between items-start mb-4">
          <div className="h-6 bg-slate-800 rounded w-1/2"></div>
          <div className="h-5 bg-slate-800 rounded w-16"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-slate-800 rounded w-3/4"></div>
          <div className="h-4 bg-slate-800 rounded w-1/2"></div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-800 flex gap-2">
          <div className="h-9 bg-slate-800 rounded flex-1"></div>
          <div className="h-9 bg-slate-800 rounded flex-1"></div>
        </div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden animate-pulse">
        <div className="bg-slate-800/50 p-4">
          <div className="flex gap-4">
            <div className="h-4 bg-slate-800 rounded w-32"></div>
            <div className="h-4 bg-slate-800 rounded w-24"></div>
            <div className="h-4 bg-slate-800 rounded w-24"></div>
            <div className="h-4 bg-slate-800 rounded w-32"></div>
          </div>
        </div>
        <div className="divide-y divide-slate-700">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4">
              <div className="flex gap-4">
                <div className="h-4 bg-slate-800 rounded w-32"></div>
                <div className="h-4 bg-slate-800 rounded w-24"></div>
                <div className="h-4 bg-slate-800 rounded w-24"></div>
                <div className="h-4 bg-slate-800 rounded w-32"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-700 rounded-lg p-4 animate-pulse">
            <div className="h-5 bg-slate-800 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-slate-800 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
