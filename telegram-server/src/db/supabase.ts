import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

// service_role client — используется ТОЛЬКО на сервере.
// Никогда не передавать этот клиент в ответ фронтенду.
export const supabase: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
