// Configuración común de Gemini. La key SOLO existe aquí, como secreto de las Edge Functions.
import { createGoogleGenerativeAI } from 'npm:@ai-sdk/google@4';
import { APICallError, RetryError } from 'npm:ai@7';

export const google = createGoogleGenerativeAI({ apiKey: Deno.env.get('GEMINI_API_KEY') });
export const MODELO = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.8-flash';

/** Traduce un error de Gemini a { status, mensaje } para el usuario. Nunca devuelve el error crudo. */
export function errorParaUsuario(error: unknown): { status: number; mensaje: string } {
  console.error(error);
  const real = RetryError.isInstance(error) ? error.lastError : error;
  if (APICallError.isInstance(real) && real.statusCode === 429) {
    return { status: 429, mensaje: 'Se agotó la cuota gratuita de Gemini. Espera un minuto e intenta de nuevo.' };
  }
  return { status: 502, mensaje: 'La IA no pudo responder. Intenta de nuevo.' };
}
