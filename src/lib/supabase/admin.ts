import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a service role: ignora o RLS. Só para rotas sem usuário logado
 * (webhooks), e sempre filtrando por dono explicitamente.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
