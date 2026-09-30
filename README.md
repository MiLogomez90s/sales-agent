# Sales Agent

Conversational sales agent with memory, guardrails, tool integrations, and LLM provider support.

## Features

- **Chat** — Conversational interface with streaming responses and tool call visibility
- **Memory** — Store facts about leads, preferences, and past interactions; the agent recalls relevant memories during conversations
- **Settings** — Tune system prompt, model, temperature, and behavior
- **Guardrails** — Define rules the agent must follow (max discount, forbidden topics, escalation keywords, response length limits, tool approval requirements)
- **Tools** — Connect external services via HTTP requests or incoming webhooks, with pre-built templates for CRM, scheduling, and communication
- **LLM Providers** — Configure OpenRouter or any OpenAI-compatible API
- **Logs** — Full audit trail of conversations, tool calls, and errors

## Quick Start (Local Development)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 1. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL Editor, run the migration file: `supabase/migrations/0001_init.sql`
3. Go to **Project Settings → API** and copy:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon public key)
   - `SUPABASE_SERVICE_ROLE_KEY` (service role key)
4. Copy `.env.local.example` to `.env.local` and fill in the values

### 2. Add an LLM Provider

Go to **Settings → LLM Providers** and add your OpenRouter API key (get one at [openrouter.ai/keys](https://openrouter.ai/keys)).

### 3. Configure the Agent

Go to **Settings** to adjust the system prompt, model, temperature, and language.

### 4. Set Up Guardrails

Go to **Settings → Guardrails** to add rules like:
- Maximum discount the agent can offer
- Topics the agent must never discuss
- Keywords that trigger human escalation
- Tools that require approval before execution

### 5. Add Memory

Go to **Memory** to store facts the agent should remember:
- Lead preferences and past interactions
- Pricing rules and exceptions
- Competitive intelligence
- Common objections and responses

### 6. Add Tools

Go to **Tools** to create HTTP tools the agent can call or webhooks for external systems. Use **From Template** for pre-configured sales tools:
- **CRM**: Add contact, update deal, get contact info
- **Data**: Search leads, analyze lead, get company data
- **Scheduling**: Schedule meeting, check availability
- **Communication**: Send WhatsApp, send email
- **Analytics**: Get sales metrics

## Deploying to Vercel

### 1. Push to GitHub

```bash
git add -A
git commit -m "Your commit message"
git push origin main
```

### 2. Import into Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub login)
2. Click **"Add New..." → "Project"**
3. Find your repo and click **"Import"**
4. Vercel auto-detects Next.js — no config changes needed

### 3. Set Environment Variables

In the Vercel import screen, expand **"Environment Variables"** and add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key` |
| `SUPABASE_SERVICE_ROLE_KEY` | `your-service-role-key` |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` (after first deploy) |
| `LOG_LEVEL` | `info` |

### 4. Deploy

Click **"Deploy"**. Vercel will install dependencies, build, and deploy.

## Project Structure

```
src/
  app/
    page.tsx              # Chat interface
    memory/page.tsx       # Memory management
    settings/page.tsx     # Agent config + guardrails + LLM providers
    tools/page.tsx        # Tool management + templates
    logs/page.tsx         # Log viewer
    api/
      chat/               # Chat endpoint (SSE streaming)
      config/             # Agent config CRUD
      memories/           # Memory CRUD
      guardrails/         # Guardrail CRUD
      tools/              # Tool CRUD + test
      tool-templates/     # Template listing + instantiation
      llm-providers/      # LLM provider CRUD
      logs/               # Log queries
      webhooks/[toolId]   # Incoming webhook receiver
  lib/
    agent/engine.ts       # Core agent loop (LLM + tools + memory + guardrails)
    llm/openrouter.ts     # OpenRouter / OpenAI-compatible client
    tools/executor.ts     # HTTP tool executor
    tools/registry.ts     # Tool CRUD + LLM tool definitions
    tools/templates.ts    # Pre-built sales tool templates
    memory/index.ts       # Memory CRUD + relevance search
    guardrails/index.ts   # Guardrail CRUD + prompt injection + response checking
    db/index.ts           # Supabase client
    logger/index.ts       # Logging to Supabase
supabase/
  migrations/
    0001_init.sql         # Database schema
```

## Tech Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Supabase** (Postgres database)
- **OpenRouter** for LLM access
- **Tailwind CSS**

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Send message (SSE stream) |
| `/api/chat` | GET | List conversations |
| `/api/conversations/[id]` | GET/DELETE | Get/delete conversation |
| `/api/config` | GET/PUT | Agent configuration |
| `/api/memories` | GET/POST | List/create memories |
| `/api/memories/[id]` | PATCH/DELETE | Update/delete memory |
| `/api/guardrails` | GET/POST | List/create guardrails |
| `/api/guardrails/[id]` | PATCH/DELETE | Update/delete guardrail |
| `/api/tools` | GET/POST | List/create tools |
| `/api/tools/[id]` | PATCH/DELETE | Update/delete tool |
| `/api/tools/[id]/test` | POST | Test an HTTP tool |
| `/api/tool-templates` | GET | List available templates |
| `/api/tool-templates/[id]/instantiate` | POST | Create tool from template |
| `/api/llm-providers` | GET/POST | List/add providers |
| `/api/llm-providers/[id]` | PATCH/DELETE | Update/delete provider |
| `/api/logs` | GET | Query logs (filter by level, category) |
| `/api/webhooks/[toolId]` | POST | Receive incoming webhooks |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | Supabase service role key (bypasses RLS) |
| `NEXT_PUBLIC_APP_URL` | Recommended | Your app URL |
| `LOG_LEVEL` | No | `debug`, `info`, `warn`, or `error` |
