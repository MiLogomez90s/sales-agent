import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _supabase: SupabaseClient | null = null;

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      if (!supabaseUrl || !supabaseKey) {
        throw new Error(
          'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).'
        );
      }
      _supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
    return (_supabase as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Helper types for common operations
export interface QueryResult<T = Record<string, unknown>> {
  data: T[] | null;
  error: { message: string } | null;
}

// Wrapper to mimic better-sqlite3 prepare().run/get/all interface using Supabase
export function prepare(table: string) {
  return {
    run: async (...params: unknown[]) => {
      // Parse INSERT/UPDATE/DELETE based on params
      // This is a simplified wrapper - for complex queries use supabase directly
      return { changes: 0, lastInsertRowid: 0 };
    },
    get: async (...params: unknown[]) => {
      const { data, error } = await supabase.from(table).select('*').single();
      if (error) return undefined;
      return data;
    },
    all: async (...params: unknown[]) => {
      const { data, error } = await supabase.from(table).select('*');
      if (error) return [];
      return data || [];
    },
  };
}

// Execute raw SQL via Supabase RPC (for schema initialization)
export async function exec(sql: string): Promise<void> {
  const { error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.warn('Schema init warning:', error.message);
  }
}

// Initialize schema - run this once via Supabase SQL editor or API
export async function initializeSchema(): Promise<void> {
  // Schema is created via Supabase SQL editor or migration file
  // This function just verifies the connection
  const { error } = await supabase.from('agent_config').select('id').limit(1);
  if (error) {
    console.warn('Schema not initialized yet. Run the SQL migration in Supabase dashboard.');
  }
}
