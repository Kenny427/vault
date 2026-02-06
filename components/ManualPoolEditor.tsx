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
    created_at: string;
}

export default function ManualPoolEditor() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<PoolItem[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [filter, setFilter] = useState('');

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

    const filteredItems = items.filter(item =>
        item.item_name.toLowerCase().includes(filter.toLowerCase()) ||
        item.category?.toLowerCase().includes(filter.toLowerCase())
    );

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
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                >
                    {showAddForm ? 'Cancel' : '+ Add Item'}
                </button>
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
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Item</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Category</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Priority</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Tags</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-700/50">
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-slate-300">{item.item_name}</div>
                                            <div className="text-xs text-slate-500">ID: {item.item_id}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400">
                                            {item.category || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400">{item.priority}</td>
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
