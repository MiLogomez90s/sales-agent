import { createClient, Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'sales-agent.db');

// Use Turso in production (set TURSO_DATABASE_URL), local file otherwise
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

let db: Client | null = null;

export function getDb(): Client {
  if (db) return db;

  if (TURSO_URL) {
    // Production: Turso serverless SQLite
    db = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    });
  } else {
    // Development: local file
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    db = createClient({ url: `file:${DB_PATH}` });
  }

  initializeSchema(db);
  return db;
}

// Async wrapper mimicking better-sqlite3 prepare().run/get/all interface
export async function prepare(sql: string) {
  const client = getDb();

  return {
    run: async (...params: unknown[]) => {
      const result = await client.execute({ sql, args: params as never[] });
      return { changes: result.rowsAffected, lastInsertRowid: result.lastInsertRowid };
    },
    get: async (...params: unknown[]) => {
      const result = await client.execute({ sql, args: params as never[] });
      return result.rows[0] as unknown;
    },
    all: async (...params: unknown[]) => {
      const result = await client.execute({ sql, args: params as never[] });
      return result.rows as unknown[];
    },
  };
}

// Execute raw SQL (for schema initialization)
export async function exec(sql: string): Promise<void> {
  const client = getDb();
  const statements = sql.split(';').filter((s) => s.trim());
  for (const stmt of statements) {
    await client.execute(stmt);
  }
}

async function initializeSchema(client: Client) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS agent_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      system_prompt TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
      temperature REAL NOT NULL DEFAULT 0.7,
      max_tokens INTEGER NOT NULL DEFAULT 4096,
      language TEXT NOT NULL DEFAULT 'es',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Nueva conversación',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
      content TEXT NOT NULL,
      tool_calls TEXT,
      tool_call_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS tools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('http', 'webhook')),
      config TEXT NOT NULL DEFAULT '{}',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS llm_providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      api_key TEXT NOT NULL,
      base_url TEXT NOT NULL DEFAULT 'https://openrouter.ai/api/v1',
      models TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL DEFAULT 'general',
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS guardrails (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('max_discount', 'forbidden_topic', 'escalation_keyword', 'max_response_length', 'require_approval', 'custom')),
      config TEXT NOT NULL DEFAULT '{}',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS tool_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('http', 'webhook')),
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Create indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)',
    'CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category)',
    'CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category)',
    'CREATE INDEX IF NOT EXISTS idx_memories_key ON memories(key)',
  ];
  for (const idx of indexes) {
    await client.execute(idx);
  }

  // Ensure default config exists
  const existing = await client.execute('SELECT id FROM agent_config WHERE id = 1');
  if (existing.rows.length === 0) {
    await client.execute({
      sql: `INSERT INTO agent_config (id, system_prompt, model, temperature, max_tokens, language)
            VALUES (1, ?, ?, ?, ?, ?)`,
      args: [
        'Eres un agente de ventas experto y amigable. Tu objetivo es ayudar a los clientes a encontrar el producto o servicio que necesitan, responder sus preguntas y guiarlos hacia la compra. Sé conciso, profesional y siempre enfocado en las necesidades del cliente.',
        'openai/gpt-4o-mini',
        0.7,
        4096,
        'es',
      ],
    });
  }
}
