'use client';

import { useState, useEffect, useCallback } from 'react';

interface LogEntry {
  id: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  message: string;
  metadata: string | null;
  created_at: string;
}

const LEVEL_COLORS: Record<string, string> = {
  debug: 'text-gray-500',
  info: 'text-blue-600',
  warn: 'text-yellow-600',
  error: 'text-red-600',
};

const LEVEL_BADGES: Record<string, string> = {
  debug: 'bg-gray-100 text-gray-600',
  info: 'bg-blue-100 text-blue-700',
  warn: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');
  const [limit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams();
    if (level) params.set('level', level);
    if (category) params.set('category', category);
    params.set('limit', String(limit));
    params.set('offset', String(offset));

    const res = await fetch(`/api/logs?${params}`);
    const data = await res.json();
    if (data.logs) {
      setLogs(data.logs);
      setTotal(data.total);
    }
  }, [level, category, limit, offset]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const categories = Array.from(new Set(logs.map((l) => l.category)));

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Logs</h2>
          <p className="text-xs text-gray-500">{total} entries</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchLogs}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-3">
        <select
          value={level}
          onChange={(e) => { setLevel(e.target.value); setOffset(0); }}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All levels</option>
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>

        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setOffset(0); }}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {(level || category) && (
          <button
            onClick={() => { setLevel(''); setCategory(''); setOffset(0); }}
            className="text-sm text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto">
        {logs.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            No logs found
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {logs.map((log) => (
            <div
              key={log.id}
              className="px-6 py-2.5 hover:bg-gray-50 cursor-pointer"
              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
                  {log.created_at}
                </span>
                <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${LEVEL_BADGES[log.level]}`}>
                  {log.level}
                </span>
                <span className="text-xs font-medium text-gray-500">{log.category}</span>
                <span className="text-sm text-gray-900 truncate">{log.message}</span>
              </div>

              {expandedLog === log.id && log.metadata && (
                <div className="mt-2 ml-[180px]">
                  <pre className="bg-gray-100 rounded-md p-3 text-xs overflow-x-auto text-gray-700">
                    {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Previous
          </button>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
