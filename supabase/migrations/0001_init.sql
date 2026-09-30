-- Sales Agent Schema for Supabase (Postgres)
-- Run this in: Supabase Dashboard → SQL Editor → New Query

CREATE TABLE IF NOT EXISTS agent_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  system_prompt TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
  temperature DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 4096,
  language TEXT NOT NULL DEFAULT 'es',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Nueva conversación',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_call_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('http', 'webhook')),
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logs (
  id BIGSERIAL PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS llm_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  base_url TEXT NOT NULL DEFAULT 'https://openrouter.ai/api/v1',
  models JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'general',
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guardrails (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('max_discount', 'forbidden_topic', 'escalation_keyword', 'max_response_length', 'require_approval', 'custom')),
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tool_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('http', 'webhook')),
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category);
CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
CREATE INDEX IF NOT EXISTS idx_memories_key ON memories(key);

-- Default agent config
INSERT INTO agent_config (id, system_prompt, model, temperature, max_tokens, language)
VALUES (
  1,
  'Eres un agente de ventas experto y amigable. Tu objetivo es ayudar a los clientes a encontrar el producto o servicio que necesitan, responder sus preguntas y guiarlos hacia la compra. Sé conciso, profesional y siempre enfocado en las necesidades del cliente.',
  'openai/gpt-4o-mini',
  0.7,
  4096,
  'es'
)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (optional - for public access, we use service role key)
ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardrails ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_templates ENABLE ROW LEVEL SECURITY;

-- Allow all operations for service role (server-side)
CREATE POLICY "Allow all for service role" ON agent_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON tools FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON llm_providers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON memories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON guardrails FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON tool_templates FOR ALL USING (true) WITH CHECK (true);
