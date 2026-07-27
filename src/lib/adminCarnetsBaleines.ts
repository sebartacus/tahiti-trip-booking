import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function getAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) return supabase;

  if (!supabaseUrl) throw new Error("Configuration Supabase admin manquante.");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
