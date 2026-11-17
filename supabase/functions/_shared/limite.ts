// C5 · Límite de peticiones de IA por usuario en 24 horas.
// Se cuenta con ctx.supabase: el cliente DEL USUARIO, sujeto a RLS.
// Así la función solo puede ver e insertar las filas de quien llama, y nadie puede borrarlas.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type FuncionIA = 'tutor' | 'tarjetas' | 'describir-foto';

const LIMITE = Number(Deno.env.get('LIMITE_DIARIO') ?? '20');

/** Devuelve una Response 429/500 si NO puede continuar; null si puede llamar a Gemini. */
export async function verificarLimite(
  supabase: SupabaseClient,
  userId: string,
  funcion: FuncionIA,
): Promise<Response | null> {
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from('uso_ia')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', desde);

  if (error) {
    console.error('uso_ia select', error);
    return Response.json({ error: 'No se pudo verificar tu límite de uso.' }, { status: 500 });
  }

  if ((count ?? 0) >= LIMITE) {
    return Response.json(
      { error: `Llegaste al límite de ${LIMITE} peticiones de IA en 24 horas. Vuelve mañana.` },
      { status: 429 },
    );
  }

  // user_id lo pone la base (default auth.uid()); RLS exige que sea el del token.
  const { error: errInsert } = await supabase.from('uso_ia').insert({ funcion });
  if (errInsert) {
    console.error('uso_ia insert', errInsert);
    return Response.json({ error: 'No se pudo registrar tu uso.' }, { status: 500 });
  }
  return null;
}
