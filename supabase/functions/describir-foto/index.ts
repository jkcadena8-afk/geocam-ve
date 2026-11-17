// Taller "GeoCam ve" · T1: Edge Function "describir-foto".
// Recibe { foto: "data:image/jpeg;base64,..." } y responde { descripcion }.
// Usa el MISMO secreto GEMINI_API_KEY que "tutor". Sin token válido responde 401.
import { withSupabase } from 'npm:@supabase/server@1';
import { generateText } from 'npm:ai@7';
import { errorParaUsuario, google, MODELO, TIEMPO_MAXIMO_MS } from '../_shared/gemini.ts';
import { verificarLimite } from '../_shared/limite.ts';

const PREFIJO = 'data:image/jpeg;base64,';
const MAX_BASE64 = 400_000; // ~300 KB de imagen; la app la reduce a 1024 px JPEG 0.7 (~150 KB)

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return Response.json({ error: 'Usa POST' }, { status: 405 });

    const body = await req.json().catch(() => null);
    const foto: unknown = body?.foto;
    if (typeof foto !== 'string' || !foto.startsWith(PREFIJO)) {
      return Response.json({ error: 'Envía la foto como data URL JPEG.' }, { status: 400 });
    }
    const base64 = foto.slice(PREFIJO.length);
    if (base64.length > MAX_BASE64) {
      return Response.json({ error: 'La foto es muy grande. Redúcela antes de enviarla.' }, { status: 413 });
    }

    const bloqueo = await verificarLimite(ctx.supabase, ctx.userClaims!.id, 'describir-foto');
    if (bloqueo) return bloqueo;

    try {
      const { text } = await generateText({
        model: google(MODELO),
        instructions: 'Describes fotos en español en 1 o 2 frases, concretas. No inventes lugares ni personas.',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe esta foto.' },
              // La imagen va SIN el prefijo "data:...;base64,"
              { type: 'file', mediaType: 'image/jpeg', data: base64 },
            ],
          },
        ],
        temperature: 0.3,
        maxRetries: 1,
        maxOutputTokens: 200,
        abortSignal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
      });
      return Response.json({ descripcion: text.trim() });
    } catch (e) {
      const { status, mensaje } = errorParaUsuario(e);
      return Response.json({ error: mensaje }, { status });
    }
  }),
};
