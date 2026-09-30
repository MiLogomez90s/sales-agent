'use client';

import { useState, useEffect } from 'react';

interface AgentConfig {
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  language: string;
}

interface LlmProvider {
  id: string;
  name: string;
  api_key: string;
  base_url: string;
  models: string;
  is_active: number;
}

interface Guardrail {
  id: string;
  name: string;
  type: 'max_discount' | 'forbidden_topic' | 'escalation_keyword' | 'max_response_length' | 'require_approval' | 'custom';
  config: string;
  is_active: number;
}

const POPULAR_MODELS = [
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-haiku',
  'google/gemini-pro',
  'google/gemini-flash',
  'meta-llama/llama-3.1-70b-instruct',
  'meta-llama/llama-3.1-8b-instruct',
  'mistralai/mistral-large',
  'mistralai/mistral-7b-instruct',
];

const GUARDRAIL_TYPES = [
  { id: 'max_discount', label: 'Max Discount %', description: 'Prevents offering discounts above a threshold' },
  { id: 'forbidden_topic', label: 'Forbidden Topics', description: 'Blocks discussion of specific topics' },
  { id: 'escalation_keyword', label: 'Escalation Keywords', description: 'Triggers human escalation when keywords detected' },
  { id: 'max_response_length', label: 'Max Response Length', description: 'Limits response character count' },
  { id: 'require_approval', label: 'Require Approval', description: 'Requires human approval before executing specific tools' },
  { id: 'custom', label: 'Custom Rule', description: 'Define custom regex patterns to block' },
];

export default function SettingsPage() {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [providers, setProviders] = useState<LlmProvider[]>([]);
  const [guardrails, setGuardrails] = useState<Guardrail[]>([]);
  const [newProvider, setNewProvider] = useState({ name: '', api_key: '', base_url: 'https://openrouter.ai/api/v1' });
  const [showGuardrailForm, setShowGuardrailForm] = useState(false);
  const [editingGuardrail, setEditingGuardrail] = useState<Guardrail | null>(null);
  const [guardrailForm, setGuardrailForm] = useState({
    name: '',
    type: 'max_discount' as Guardrail['type'],
    max_discount: '10',
    topics: '',
    keywords: '',
    max_length: '2000',
    tools: '',
    patterns: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchConfig();
    fetchProviders();
    fetchGuardrails();
  }, []);

  const fetchConfig = async () => {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.config) setConfig(data.config);
  };

  const fetchProviders = async () => {
    const res = await fetch('/api/llm-providers');
    const data = await res.json();
    if (data.providers) setProviders(data.providers);
  };

  const fetchGuardrails = async () => {
    const res = await fetch('/api/guardrails');
    const data = await res.json();
    if (data.guardrails) setGuardrails(data.guardrails);
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSaving(true);
    setMessage('');

    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (res.ok) {
      setMessage('Configuration saved successfully');
    } else {
      const data = await res.json();
      setMessage(`Error: ${data.error}`);
    }
    setSaving(false);
  };

  const handleAddProvider = async () => {
    if (!newProvider.name || !newProvider.api_key) return;

    const res = await fetch('/api/llm-providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProvider),
    });

    if (res.ok) {
      setNewProvider({ name: '', api_key: '', base_url: 'https://openrouter.ai/api/v1' });
      fetchProviders();
      setMessage('Provider added successfully');
    } else {
      const data = await res.json();
      setMessage(`Error: ${data.error}`);
    }
  };

  const handleToggleProvider = async (id: string, isActive: number) => {
    const res = await fetch(`/api/llm-providers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive ? 0 : 1 }),
    });
    if (res.ok) fetchProviders();
  };

  const handleDeleteProvider = async (id: string) => {
    const res = await fetch(`/api/llm-providers/${id}`, { method: 'DELETE' });
    if (res.ok) fetchProviders();
  };

  const resetGuardrailForm = () => {
    setGuardrailForm({
      name: '',
      type: 'max_discount',
      max_discount: '10',
      topics: '',
      keywords: '',
      max_length: '2000',
      tools: '',
      patterns: '',
    });
    setEditingGuardrail(null);
    setShowGuardrailForm(false);
  };

  const handleEditGuardrail = (guardrail: Guardrail) => {
    const config = JSON.parse(guardrail.config);
    setGuardrailForm({
      name: guardrail.name,
      type: guardrail.type,
      max_discount: String(config.max_discount || '10'),
      topics: (config.topics || []).join(', '),
      keywords: (config.keywords || []).join(', '),
      max_length: String(config.max_length || '2000'),
      tools: (config.tools || []).join(', '),
      patterns: (config.patterns || []).join('\n'),
    });
    setEditingGuardrail(guardrail);
    setShowGuardrailForm(true);
  };

  const handleSubmitGuardrail = async () => {
    setMessage('');
    if (!guardrailForm.name) {
      setMessage('Name is required');
      return;
    }

    const config: Record<string, unknown> = {};
    switch (guardrailForm.type) {
      case 'max_discount':
        config.max_discount = parseInt(guardrailForm.max_discount, 10);
        break;
      case 'forbidden_topic':
        config.topics = guardrailForm.topics.split(',').map((t) => t.trim()).filter(Boolean);
        break;
      case 'escalation_keyword':
        config.keywords = guardrailForm.keywords.split(',').map((t) => t.trim()).filter(Boolean);
        break;
      case 'max_response_length':
        config.max_length = parseInt(guardrailForm.max_length, 10);
        break;
      case 'require_approval':
        config.tools = guardrailForm.tools.split(',').map((t) => t.trim()).filter(Boolean);
        break;
      case 'custom':
        config.patterns = guardrailForm.patterns.split('\n').map((p) => p.trim()).filter(Boolean);
        break;
    }

    const payload = { name: guardrailForm.name, type: guardrailForm.type, config };
    const url = editingGuardrail ? `/api/guardrails/${editingGuardrail.id}` : '/api/guardrails';
    const method = editingGuardrail ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setMessage(editingGuardrail ? 'Guardrail updated' : 'Guardrail created');
      resetGuardrailForm();
      fetchGuardrails();
    } else {
      const data = await res.json();
      setMessage(`Error: ${data.error}`);
    }
  };

  const handleToggleGuardrail = async (guardrail: Guardrail) => {
    const res = await fetch(`/api/guardrails/${guardrail.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: guardrail.is_active ? 0 : 1 }),
    });
    if (res.ok) fetchGuardrails();
  };

  const handleDeleteGuardrail = async (id: string) => {
    const res = await fetch(`/api/guardrails/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setMessage('Guardrail deleted');
      fetchGuardrails();
    }
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
        <p className="text-xs text-gray-500">Configure your sales agent, guardrails, and LLM providers</p>
      </div>

      <div className="flex-1 px-6 py-6 space-y-8 max-w-3xl">
        {message && (
          <div className={`p-3 rounded-md text-sm ${message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        {/* Agent Configuration */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Agent Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
              <textarea
                value={config.system_prompt}
                onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
                rows={6}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Define the agent&apos;s personality, behavior, and sales approach</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <select
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {POPULAR_MODELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <select
                  value={config.language}
                  onChange={(e) => setConfig({ ...config, language: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="pt">Português</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature: {config.temperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
                <input
                  type="number"
                  value={config.max_tokens}
                  onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value, 10) })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </section>

        {/* Guardrails */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Guardrails</h3>
              <p className="text-xs text-gray-500">Rules the agent must follow — injected into every prompt</p>
            </div>
            <button
              onClick={() => { resetGuardrailForm(); setShowGuardrailForm(true); }}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              + Add Guardrail
            </button>
          </div>

          {/* Guardrail Form */}
          {showGuardrailForm && (
            <div className="border border-gray-200 rounded-lg p-5 mb-4 space-y-4">
              <h4 className="text-sm font-medium text-gray-900">
                {editingGuardrail ? 'Edit Guardrail' : 'New Guardrail'}
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={guardrailForm.name}
                    onChange={(e) => setGuardrailForm({ ...guardrailForm, name: e.target.value })}
                    placeholder="e.g., Max 10% discount"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={guardrailForm.type}
                    onChange={(e) => setGuardrailForm({ ...guardrailForm, type: e.target.value as Guardrail['type'] })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {GUARDRAIL_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {guardrailForm.type === 'max_discount' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount %</label>
                  <input
                    type="number"
                    value={guardrailForm.max_discount}
                    onChange={(e) => setGuardrailForm({ ...guardrailForm, max_discount: e.target.value })}
                    className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {guardrailForm.type === 'forbidden_topic' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Forbidden Topics (comma-separated)</label>
                  <input
                    type="text"
                    value={guardrailForm.topics}
                    onChange={(e) => setGuardrailForm({ ...guardrailForm, topics: e.target.value })}
                    placeholder="politics, religion, competitors"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {guardrailForm.type === 'escalation_keyword' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Escalation Keywords (comma-separated)</label>
                  <input
                    type="text"
                    value={guardrailForm.keywords}
                    onChange={(e) => setGuardrailForm({ ...guardrailForm, keywords: e.target.value })}
                    placeholder="manager, lawsuit, cancel, refund"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {guardrailForm.type === 'max_response_length' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Response Length (characters)</label>
                  <input
                    type="number"
                    value={guardrailForm.max_length}
                    onChange={(e) => setGuardrailForm({ ...guardrailForm, max_length: e.target.value })}
                    className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {guardrailForm.type === 'require_approval' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tools Requiring Approval (comma-separated)</label>
                  <input
                    type="text"
                    value={guardrailForm.tools}
                    onChange={(e) => setGuardrailForm({ ...guardrailForm, tools: e.target.value })}
                    placeholder="add_contact_crm, send_whatsapp, schedule_meeting"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {guardrailForm.type === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Regex Patterns (one per line)</label>
                  <textarea
                    value={guardrailForm.patterns}
                    onChange={(e) => setGuardrailForm({ ...guardrailForm, patterns: e.target.value })}
                    rows={3}
                    placeholder="\\b(confidential|secret|password)\\b"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSubmitGuardrail}
                  disabled={!guardrailForm.name}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {editingGuardrail ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={resetGuardrailForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Guardrails List */}
          <div className="space-y-2">
            {guardrails.length === 0 && !showGuardrailForm && (
              <p className="text-sm text-gray-500 py-4">No guardrails configured. Add rules to control agent behavior.</p>
            )}

            {guardrails.map((g) => {
              const config = JSON.parse(g.config);
              const typeLabel = GUARDRAIL_TYPES.find((t) => t.id === g.type)?.label || g.type;
              return (
                <div key={g.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{g.name}</p>
                      <span className="px-1.5 py-0.5 text-xs rounded bg-orange-100 text-orange-700">
                        {typeLabel}
                      </span>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${g.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {g.is_active ? 'active' : 'inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {g.type === 'max_discount' && `Max discount: ${config.max_discount}%`}
                      {g.type === 'forbidden_topic' && `Topics: ${(config.topics || []).join(', ')}`}
                      {g.type === 'escalation_keyword' && `Keywords: ${(config.keywords || []).join(', ')}`}
                      {g.type === 'max_response_length' && `Max length: ${config.max_length} chars`}
                      {g.type === 'require_approval' && `Tools: ${(config.tools || []).join(', ')}`}
                      {g.type === 'custom' && `${(config.patterns || []).length} pattern(s)`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleGuardrail(g)}
                      className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                      {g.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleEditGuardrail(g)}
                      className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteGuardrail(g.id)}
                      className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* LLM Providers */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">LLM Providers</h3>

          <div className="space-y-2 mb-4">
            {providers.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.base_url}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleProvider(p.id, p.is_active)}
                    className={`px-2 py-1 text-xs rounded ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
                  >
                    {p.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => handleDeleteProvider(p.id)}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border border-gray-200 rounded-md p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Add Provider</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Provider name (e.g., OpenRouter)"
                value={newProvider.name}
                onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="API Key"
                value={newProvider.api_key}
                onChange={(e) => setNewProvider({ ...newProvider, api_key: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              type="text"
              placeholder="Base URL"
              value={newProvider.base_url}
              onChange={(e) => setNewProvider({ ...newProvider, base_url: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddProvider}
              disabled={!newProvider.name || !newProvider.api_key}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              Add Provider
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
