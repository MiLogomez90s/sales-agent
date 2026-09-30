'use client';

import { useState, useEffect } from 'react';

interface Tool {
  id: string;
  name: string;
  description: string;
  type: 'http' | 'webhook';
  config: string;
  is_active: number;
}

interface ToolTemplate {
  id: string;
  name: string;
  description: string;
  category: 'crm' | 'data' | 'scheduling' | 'communication' | 'analytics';
  type: 'http' | 'webhook';
  config: Record<string, unknown>;
  defaultName: string;
  defaultDescription: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  crm: 'CRM & Contacts',
  data: 'Data & Research',
  scheduling: 'Scheduling',
  communication: 'Communication',
  analytics: 'Analytics',
};

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [templates, setTemplates] = useState<ToolTemplate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [testingTool, setTestingTool] = useState<Tool | null>(null);
  const [testParams, setTestParams] = useState('{}');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'http' as 'http' | 'webhook',
    method: 'GET' as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    url: '',
    headers: '',
    body_template: '',
    trigger_description: '',
  });

  useEffect(() => {
    fetchTools();
    fetchTemplates();
  }, []);

  const fetchTools = async () => {
    const res = await fetch('/api/tools');
    const data = await res.json();
    if (data.tools) setTools(data.tools);
  };

  const fetchTemplates = async () => {
    const res = await fetch('/api/tool-templates');
    const data = await res.json();
    if (data.templates) setTemplates(data.templates);
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      type: 'http',
      method: 'GET',
      url: '',
      headers: '',
      body_template: '',
      trigger_description: '',
    });
    setEditingTool(null);
    setShowForm(false);
  };

  const handleEdit = (tool: Tool) => {
    const config = JSON.parse(tool.config);
    setForm({
      name: tool.name,
      description: tool.description,
      type: tool.type,
      method: config.method || 'GET',
      url: config.url || '',
      headers: config.headers ? JSON.stringify(config.headers, null, 2) : '',
      body_template: config.body_template || '',
      trigger_description: config.trigger_description || '',
    });
    setEditingTool(tool);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setMessage('');

    const config: Record<string, unknown> = {};

    if (form.type === 'http') {
      config.method = form.method;
      config.url = form.url;
      if (form.headers) {
        try { config.headers = JSON.parse(form.headers); } catch { setMessage('Invalid JSON in headers'); return; }
      }
      if (form.body_template) config.body_template = form.body_template;
    } else {
      config.trigger_description = form.trigger_description;
    }

    const payload = {
      name: form.name,
      description: form.description,
      type: form.type,
      config,
    };

    const url = editingTool ? `/api/tools/${editingTool.id}` : '/api/tools';
    const method = editingTool ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setMessage(editingTool ? 'Tool updated' : 'Tool created');
      resetForm();
      fetchTools();
    } else {
      const data = await res.json();
      setMessage(`Error: ${data.error}`);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/tools/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setMessage('Tool deleted');
      fetchTools();
    }
  };

  const handleToggle = async (tool: Tool) => {
    const res = await fetch(`/api/tools/${tool.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: tool.is_active ? 0 : 1 }),
    });
    if (res.ok) fetchTools();
  };

  const handleTest = async () => {
    if (!testingTool) return;
    setTestResult(null);

    let params: Record<string, unknown>;
    try {
      params = JSON.parse(testParams);
    } catch {
      setTestResult('Invalid JSON parameters');
      return;
    }

    const res = await fetch(`/api/tools/${testingTool.id}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parameters: params }),
    });

    const data = await res.json();
    setTestResult(JSON.stringify(data.result, null, 2));
  };

  const handleInstantiateTemplate = async (templateId: string) => {
    const res = await fetch(`/api/tool-templates/${templateId}/instantiate`, {
      method: 'POST',
    });

    if (res.ok) {
      setMessage('Tool created from template — edit the URL and credentials');
      fetchTools();
      setShowTemplates(false);
    } else {
      const data = await res.json();
      setMessage(`Error: ${data.error}`);
    }
  };

  const groupedTemplates = templates.reduce<Record<string, ToolTemplate[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tools</h2>
          <p className="text-xs text-gray-500">Connect external services via HTTP or webhooks</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowTemplates(!showTemplates); setShowForm(false); }}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            {showTemplates ? 'Hide Templates' : 'From Template'}
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); setShowTemplates(false); }}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            + Add Tool
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 max-w-4xl">
        {message && (
          <div className={`p-3 rounded-md text-sm mb-4 ${message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        {/* Templates Panel */}
        {showTemplates && (
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-5 mb-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">Tool Templates</h3>
            <p className="text-xs text-blue-700 mb-4">
              Pre-configured tools for common sales operations. Click to instantiate, then edit the URL and credentials.
            </p>
            <div className="space-y-4">
              {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">
                    {CATEGORY_LABELS[category] || category}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {categoryTemplates.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => handleInstantiateTemplate(tpl.id)}
                        className="text-left p-3 bg-white border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        <p className="text-sm font-medium text-gray-900">{tpl.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{tpl.description}</p>
                        <span className={`inline-block mt-1 px-1.5 py-0.5 text-xs rounded ${tpl.type === 'http' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {tpl.type}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tool Form */}
        {showForm && (
          <div className="border border-gray-200 rounded-lg p-5 mb-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {editingTool ? 'Edit Tool' : 'New Tool'}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., create_lead, send_whatsapp"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as 'http' | 'webhook' })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="http">HTTP Request</option>
                  <option value="webhook">Webhook (Incoming)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What does this tool do?"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">The LLM uses this description to decide when to call the tool</p>
            </div>

            {form.type === 'http' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                    <select
                      value={form.method}
                      onChange={(e) => setForm({ ...form, method: e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                    <input
                      type="text"
                      value={form.url}
                      onChange={(e) => setForm({ ...form, url: e.target.value })}
                      placeholder="https://api.example.com/leads?city={{city}}"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Use {"{{param}}"} for dynamic values</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Headers (JSON)</label>
                  <textarea
                    value={form.headers}
                    onChange={(e) => setForm({ ...form, headers: e.target.value })}
                    rows={3}
                    placeholder='{"Authorization": "Bearer token123"}'
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {form.method !== 'GET' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Body Template</label>
                    <textarea
                      value={form.body_template}
                      onChange={(e) => setForm({ ...form, body_template: e.target.value })}
                      rows={4}
                      placeholder='{"name": "{{name}}", "email": "{{email}}"}'
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Use {"{{param}}"} for dynamic values</p>
                  </div>
                )}
              </>
            )}

            {form.type === 'webhook' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Description</label>
                <textarea
                  value={form.trigger_description}
                  onChange={(e) => setForm({ ...form, trigger_description: e.target.value })}
                  rows={3}
                  placeholder="Describe when external systems should call this webhook..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Webhook URL: <code className="bg-gray-100 px-1 rounded">/api/webhooks/{'{toolId}'}</code>
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={!form.name || !form.description}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {editingTool ? 'Update Tool' : 'Create Tool'}
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

        {/* Test Panel */}
        {testingTool && (
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-5 mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-blue-900">Test: {testingTool.name}</h3>
              <button onClick={() => { setTestingTool(null); setTestResult(null); }} className="text-blue-600 text-sm hover:underline">
                Close
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-1">Parameters (JSON)</label>
              <textarea
                value={testParams}
                onChange={(e) => setTestParams(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-blue-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleTest}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Run Test
            </button>
            {testResult && (
              <pre className="bg-white border border-blue-200 rounded-md p-3 text-xs overflow-x-auto">
                {testResult}
              </pre>
            )}
          </div>
        )}

        {/* Tools List */}
        <div className="space-y-3">
          {tools.length === 0 && !showForm && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">No tools configured yet.</p>
              <p className="text-xs mt-1">Add HTTP tools for the agent to call, or webhooks for external systems to trigger.</p>
            </div>
          )}

          {tools.map((tool) => {
            const config = JSON.parse(tool.config);
            return (
              <div key={tool.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-900">{tool.name}</h4>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${tool.type === 'http' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {tool.type}
                      </span>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${tool.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {tool.is_active ? 'active' : 'inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
                    {tool.type === 'http' && config.url && (
                      <p className="text-xs text-gray-400 mt-1 font-mono">
                        {config.method} {config.url}
                      </p>
                    )}
                    {tool.type === 'webhook' && (
                      <p className="text-xs text-gray-400 mt-1 font-mono">
                        POST /api/webhooks/{tool.id}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 ml-4">
                    {tool.type === 'http' && (
                      <button
                        onClick={() => { setTestingTool(tool); setTestParams('{}'); setTestResult(null); }}
                        className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                      >
                        Test
                      </button>
                    )}
                    <button
                      onClick={() => handleToggle(tool)}
                      className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                      {tool.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleEdit(tool)}
                      className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(tool.id)}
                      className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
