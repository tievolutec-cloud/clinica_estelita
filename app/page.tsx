import { redirect } from "next/navigation";
import ClinicApp from "@/components/clinic-app";
import ConnectedClinicApp from "@/components/connected-clinic-app";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  if (!isSupabaseConfigured()) {
    return <ClinicApp />;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("clinic_members")
    .select("clinic_id,role,clinics(name)")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return (
      <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24}}>
        <section className="card pad" style={{maxWidth:560}}>
          <h1 style={{marginTop:0}}>Usuário sem clínica vinculada</h1>
          <p>Seu login está correto, mas ainda não existe vínculo ativo em <strong>clinic_members</strong>.</p>
          <p style={{color:"var(--muted)"}}>Use o passo “Criar o primeiro usuário administrador” do README para vincular este usuário à Clínica Estelita.</p>
        </section>
      </main>
    );
  }

  const clinicId = membership.clinic_id as string;
  const clinicRelation = membership.clinics as { name?: string } | { name?: string }[] | null;
  const clinicName = Array.isArray(clinicRelation) ? clinicRelation[0]?.name : clinicRelation?.name;

  const [{ data: patients }, { data: appointments }] = await Promise.all([
    supabase
      .from("patients")
      .select("id,full_name,cpf,phone,whatsapp,email,birth_date,active,created_at")
      .eq("clinic_id", clinicId)
      .order("full_name", { ascending: true })
      .limit(500),
    supabase
      .from("appointments")
      .select("id,starts_at,ends_at,procedure_name,status,patient_id,patients(full_name)")
      .eq("clinic_id", clinicId)
      .gte("starts_at", new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString())
      .order("starts_at", { ascending: true })
      .limit(1000),
  ]);

  const userName = String(user.user_metadata?.full_name || user.email || "Usuário");

  return (
    <ConnectedClinicApp
      clinicId={clinicId}
      clinicName={clinicName || "Clínica Estelita"}
      role={String(membership.role)}
      userName={userName}
      initialPatients={patients || []}
      initialAppointments={(appointments || []) as never[]}
    />
  );
}
