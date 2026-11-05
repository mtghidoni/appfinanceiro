import { createClient } from "@/lib/supabase/server";
import ConfiguracoesScreen from "@/components/configuracoes/ConfiguracoesScreen";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <ConfiguracoesScreen userEmail={user?.email ?? ""} />;
}
