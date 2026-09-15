export function getSupabaseEnv() {
  const url =
    process.env.NEXT_PUBLIC_CLINICA_ESTELITA_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.NEXT_PUBLIC_CLINICA_ESTELITA_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return { url, key };
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseEnv();
  return Boolean(url && key);
}
