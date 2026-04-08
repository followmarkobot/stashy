import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serviceSupabase: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient | null {
  if (serviceSupabase) {
    return serviceSupabase;
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  serviceSupabase = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serviceSupabase;
}
