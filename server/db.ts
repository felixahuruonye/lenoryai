import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Primary Client (User mode)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin Client (System mode)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// In-memory fallback
class MemoryStorage {
  private store: Map<string, any[]> = new Map();

  async get(collection: string) {
    return this.store.get(collection) || [];
  }

  async set(collection: string, data: any) {
    const current = this.store.get(collection) || [];
    this.store.set(collection, [...current, data]);
  }
}

export const memoryStorage = new MemoryStorage();
