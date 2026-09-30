'use client';

import { useState, useEffect, useCallback } from 'react';

interface Memory {
  id: string;
  category: string;
  key: string;
  value: string;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { id: 'general', label: 'General' },
  { id: 'lead', label: 'Lead Info' },
  { id: 'preference', label: 'Preferences' },
  { id: 'interaction', label: 'Interactions' },
  { id: 'objection', label: 'Objections' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'competitor', label: 'Competitors' },
];

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [form, setForm] = useState({ category: 'general', key: '', value: '', metadata: '' });
  const [message, setMessage] = useState('');

  const fetchMemories = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (searchQuery) params.set('query', searchQuery);

    const res = await fetch(`/api/memories?${params}`);
    const data = await res.json();
    if (data.memories) setMemories(data.memories);
    if (data.categories) setCategories(data.categories);
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const resetForm = () => {
    setForm({ category: 'general', key: '', value: '', metadata: '' });
    setEditingMemory(null);
    setShowForm(false);
  };

  const handleEdit = (memory: Memory) => {
    setForm({
      category: memory.category,
      key: memory.key,
      value: memory.value,
      metadata: memory.metadata || '',
    });
    setEditingMemory(memory);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setMessage('');
    if (!form.key || !form.value) {
      setMessage('Key and value are required');
      return;
    }

    const payload: Record<string, unknown> = {
      category: form.category,
      key: form.key,
      value: form.value,
    };
    if (form.metadata) {
      try {
        payload.metadata = JSON.parse(form.metadata);
      } catch {
        setMessage('Metadata must be valid JSON');
        return;
      }
    }

    const url = editingMemory ? `/api/memories/${editingMemory.id}` : '/api/memories';
    const method = editingMemory ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setMessage(editingMemory ? 'Memory updated' : 'Memory created');
      resetForm();
      fetchMemories();
    } else {
      const data = await res.json();
      setMessage(`Error: ${data.error}`);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/memories/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setMessage('Memory deleted');
      fetchMemories();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Memory</h2>
          <p className="text-xs text-gray-500">
            Facts the agent remembers about leads, preferences, and past interactions
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          + Add Memory
        </button>
      </div>

      <div className="flex-1 px-6 py-6 max-w-4xl">
        {message && (
          <div className={`p-3 rounded-md text-sm mb-4 ${message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="border border-gray-200 rounded-lg p-5 mb-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {editingMemory ? 'Edit Memory' : 'New Memory'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
                <input
                  type="text"
                  value={form.key}
                  onChange={(e) => setForm({ ...form, key: e.target.value })}
                  placeholder="e.g., lead_123, pricing_tier_a"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
              <textarea
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                rows={3}
                placeholder="What should the agent remember?"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metadata (JSON, optional)</label>
              <textarea
                value={form.metadata}
                onChange={(e) => setForm({ ...form, metadata: e.target.value })}
                rows={2}
                placeholder='{"priority": "high", "source": "call_2024_01_15"}'
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={!form.key || !form.value}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {editingMemory ? 'Update' : 'Create'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Memory List */}
        <div className="space-y-2">
          {memories.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">No memories stored yet.</p>
              <p className="text-xs mt-1">Add facts about leads, pricing rules, or past interactions for the agent to recall.</p>
            </div>
          )}

          {memories.map((memory) => (
            <div key={memory.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600">
                      {memory.category}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{memory.key}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{memory.value}</p>
                  {memory.metadata && (
                    <pre className="text-xs text-gray-400 mt-1 font-mono">
                      {memory.metadata}
                    </pre>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Updated: {memory.updated_at}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 ml-4">
                  <button
                    onClick={() => handleEdit(memory)}
                    className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(memory.id)}
                    className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
