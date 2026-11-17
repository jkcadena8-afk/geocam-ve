// lib/chatTransport.ts
// Transporte de useChat hacia la Edge Function "asistente".
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { photosRepo } from '@/db/repositories/photos';
import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/supabase';

/** Error con el código HTTP para que la pantalla decida qué mostrar. */
export class ErrorIA extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ErrorIA';
  }
}

async function errorDesdeRespuesta(res: Response): Promise<ErrorIA> {
  let delServidor: string | undefined;
  try {
    delServidor = ((await res.json()) as { error?: string })?.error;
  } catch {
    /* cuerpo no JSON */
  }
  if (res.status === 401) {
    // Token vencido: se cierra la sesión y Stack.Protected lleva al login
    await supabase.auth.signOut();
    return new ErrorIA('Tu sesión venció. Vuelve a iniciar sesión.', 401);
  }
  if (res.status === 429) return new ErrorIA(delServidor ?? 'Llegaste al límite de uso. Intenta más tarde.', 429);
  return new ErrorIA(delServidor ?? `El servidor respondió con error ${res.status}. Intenta de nuevo.`, res.status);
}

/** expo/fetch entrega la respuesta por partes (streaming); el fetch normal de React Native no. */
const fetchConErrores = (async (input: string, init?: RequestInit) => {
  let res: Response;
  try {
    res = (await expoFetch(input, init as never)) as unknown as Response;
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e; // el usuario tocó ■
    throw new ErrorIA('Sin conexión. Revisa tu internet e intenta de nuevo.', 0);
  }
  if (!res.ok) throw await errorDesdeRespuesta(res);
  return res;
}) as unknown as typeof globalThis.fetch;

export function crearTransporteAsistente() {
  return new DefaultChatTransport({
    api: `${SUPABASE_URL}/functions/v1/asistente`,
    fetch: fetchConErrores,
    // Se calculan en cada mensaje: siempre va el token vigente
    headers: async (): Promise<Record<string, string>> => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new ErrorIA('No hay sesión: vuelve a iniciar sesión.', 401);
      return { Authorization: `Bearer ${token}`, apikey: SUPABASE_PUBLISHABLE_KEY };
    },
    // Resumen de las fotos actuales (sin imágenes); el servidor lo valida con zod
    body: async () => ({ fotos: await photosRepo.contextoAsistente() }),
  });
}
