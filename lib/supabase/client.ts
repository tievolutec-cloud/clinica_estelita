import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/config";

export function createClient() {
  const { url, key } = getSupabaseEnv();

  if (!url || !key) {
    throw new Error(
      "Supabase ainda não foi configurado. Adicione NEXT_PUBLIC_SUPABASE_URL e a chave pública do projeto na Vercel."
    );
  }

  return createBrowserClient(url, key);
}
