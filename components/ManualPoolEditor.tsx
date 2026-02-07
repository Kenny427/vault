'use client';

import { useState, useEffect } from 'react';

interface PoolItem {
    id: string;
    item_id: number;
    item_name: string;
    category: string | null;
    priority: number;
    enabled: boolean;
    tags: string[];
    notes: string | null;
    buy_limit: number | null;
    daily_volume: number | null;
    last_volume_update: string | null;
    created_at: string;
}

// Helper function to format volume numbers
const formatVolume = (volume: number): string => {
    if (volume >= 1000000) {
        return `${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
        return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toLocaleString();
};

export default function ManualPoolEditor() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<PoolItem[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [filter, setFilter] = useState('');
    const [updatingVolumes, setUpdatingVolumes] = useState(false);
    const [sortBy, setSortBy] = useState<'name' | 'volume' | 'buy_limit' | 'priority'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Form state
    const [itemId, setItemId] = useState('');
    const [itemName, setItemName] = useState('');
    const [category, setCategory] = useState('');
    const [priority, setPriority] = useState(0);
    const [tags, setTags] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/pool/items');
            if (response.ok) {
                const data = await response.json();
                setItems(data.items || []);
            }
        } catch (error) {
            console.error('Error loading pool items:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setItemId('');
        setItemName('');
        setCategory('');
        setPriority(0);
        setTags('');
        setNotes('');
        setShowAddForm(false);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/admin/pool/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    item_id: parseInt(itemId),
                    item_name: itemName,
                    category: category || null,
                    priority,
                    tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                    notes: notes || null,
                }),
            });

            if (response.ok) {
                await loadItems();
                resetForm();
                alert('Item added successfully!');
            } else {
                alert('Failed to add item');
            }
        } catch (error) {
            console.error('Error adding item:', error);
            alert('Error adding item');
        }
    };

    const handleUpdate = async (item: PoolItem, updates: Partial<PoolItem>) => {
        try {
            const response = await fetch('/api/admin/pool/items', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: item.id, ...updates }),
            });

            if (response.ok) {
                await loadItems();
            } else {
                alert('Failed to update item');
            }
        } catch (error) {
            console.error('Error updating item:', error);
            alert('Error updating item');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            const response = await fetch(`/api/admin/pool/items?id=${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                await loadItems();
                alert('Item deleted successfully!');
            } else {
                alert('Failed to delete item');
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Error deleting item');
        }
    };

    const handleUpdateVolumes = async () => {
        if (!confirm('This will fetch buy limits and volumes for all enabled items from the OSRS Wiki API. This may take a few minutes. Continue?')) {
            return;
        }

        setUpdatingVolumes(true);
        try {
            const response = await fetch('/api/admin/pool/update-volumes', {
                method: 'POST',
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Updated ${result.updated} items. Errors: ${result.errors}`);
                await loadItems(); // Reload to show new data
            } else {
                const error = await response.json();
                alert(`Error: ${error.error || 'Failed to update volumes'}`);
            }
        } catch (error) {
            console.error('Error updating volumes:', error);
            alert('Failed to update volumes');
        } finally {
            setUpdatingVolumes(false);
        }
    };

    const handleSort = (field: 'name' | 'volume' | 'buy_limit' | 'priority') => {
        if (sortBy === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortDirection(field === 'volume' || field === 'buy_limit' ? 'desc' : 'asc');
        }
    };

    const filteredItems = items.filter(item =>
        item.item_name.toLowerCase().includes(filter.toLowerCase()) ||
        item.category?.toLowerCase().includes(filter.toLowerCase())
    );

    const sortedItems = [...filteredItems].sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (sortBy) {
            case 'name':
                aVal = a.item_name.toLowerCase();
                bVal = b.item_name.toLowerCase();
                break;
            case 'volume':
                aVal = a.daily_volume ?? -1;
                bVal = b.daily_volume ?? -1;
                break;
            case 'buy_limit':
                aVal = a.buy_limit ?? -1;
                bVal = b.buy_limit ?? -1;
                break;
            case 'priority':
                aVal = a.priority;
                bVal = b.priority;
                break;
            default:
                return 0;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const categories = Array.from(new Set(items.map(i => i.category).filter(Boolean)));

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-100">🎯 Manual Pool Editor</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleUpdateVolumes}
                        disabled={updatingVolumes}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
                    >
                        {updatingVolumes ? '⏳ Updating...' : '📊 Update Volumes'}
                    </button>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                    >
                        {showAddForm ? 'Cancel' : '+ Add Item'}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Total Items</div>
                    <div className="text-2xl font-bold text-slate-100">{items.length}</div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Enabled</div>
                    <div className="text-2xl font-bold text-green-400">
                        {items.filter(i => i.enabled).length}
                    </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Disabled</div>
                    <div className="text-2xl font-bold text-red-400">
                        {items.filter(i => !i.enabled).length}
                    </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Categories</div>
                    <div className="text-2xl font-bold text-blue-400">{categories.length}</div>
                </div>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <form onSubmit={handleAdd} className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Item ID *
                            </label>
                            <input
                                type="number"
                                value={itemId}
                                onChange={(e) => setItemId(e.target.value)}
                                required
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded text-slate-100"
                                placeholder="e.g., 2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Item Name *
                            </label>
                            <input
                                type="text"
                                value={itemName}
                                onChange={(e) => setItemName(e.target.value)}
                                required
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded text-slate-100"
                                placeholder="e.g., Cannonball"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Category
                            </label>
                            <input
                                type="text"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded text-slate-100"
                                placeholder="e.g., Combat Supplies"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Priority
                            </label>
                            <input
                                type="number"
                                value={priority}
                                onChange={(e) => setPriority(parseInt(e.target.value))}
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded text-slate-100"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Tags (comma-separated)
                        </label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded text-slate-100"
                            placeholder="e.g., high-volume, popular, combat"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded text-slate-100"
                            placeholder="Optional notes about this item"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
                    >
                        Add to Pool
                    </button>
                </form>
            )}

            {/* Search */}
            <input
                type="text"
                placeholder="Search items..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500"
            />

            {/* Items List */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                {filteredItems.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        {filter ? 'No items match your search' : 'No items in pool yet'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-900">
                                <tr>
                                    <th 
                                        className="px-4 py-3 text-left text-xs font-semibold text-slate-400 cursor-pointer hover:text-slate-200 transition-colors"
                                        onClick={() => handleSort('name')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Item
                                            {sortBy === 'name' && (
                                                <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Category</th>
                                    <th 
                                        className="px-4 py-3 text-left text-xs font-semibold text-slate-400 cursor-pointer hover:text-slate-200 transition-colors"
                                        onClick={() => handleSort('priority')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Priority
                                            {sortBy === 'priority' && (
                                                <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-left text-xs font-semibold text-slate-400 cursor-pointer hover:text-slate-200 transition-colors"
                                        onClick={() => handleSort('buy_limit')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Buy Limit
                                            {sortBy === 'buy_limit' && (
                                                <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-left text-xs font-semibold text-slate-400 cursor-pointer hover:text-slate-200 transition-colors"
                                        onClick={() => handleSort('volume')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Daily Volume
                                            {sortBy === 'volume' && (
                                                <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Tags</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {sortedItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-700/50">
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-slate-300">{item.item_name}</div>
                                            <div className="text-xs text-slate-500">ID: {item.item_id}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400">
                                            {item.category || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400">{item.priority}</td>
                                        <td className="px-4 py-3 text-sm text-slate-400">
                                            {item.buy_limit ? item.buy_limit.toLocaleString() : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {item.daily_volume ? (
                                                <div className="text-sm text-slate-300">
                                                    {formatVolume(item.daily_volume)}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-slate-500">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {item.tags.map((tag, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded text-xs"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleUpdate(item, { enabled: !item.enabled })}
                                                className={`px-2 py-1 rounded text-xs ${item.enabled
                                                    ? 'bg-green-900/50 text-green-300'
                                                    : 'bg-red-900/50 text-red-300'
                                                    }`}
                                            >
                                                {item.enabled ? 'Enabled' : 'Disabled'}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="text-red-400 hover:text-red-300 text-sm"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
