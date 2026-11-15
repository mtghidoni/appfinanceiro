import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a service role: ignora o RLS. Só para rotas sem usuário logado
 * (webhooks), e sempre filtrando por dono explicitamente.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Chave secreta nova (sb_secret_...) ou a service_role antiga (legacy).
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SECRET_KEY não configurada no servidor.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
