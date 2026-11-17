// services/vision.ts
// Semana 10 · T2: reduce la foto y le pide a la Edge Function "describir-foto" que la describa.
// La app NUNCA habla con Gemini: la key vive solo en los secretos de la función.
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';

/** Reduce a 1024 px de ancho y JPEG 0.7 (~150 KB) y la devuelve como data URL. */
export async function reducirFoto(uri: string): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: 1024 });
  const imagen = await ctx.renderAsync();
  const guardada = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  return `data:image/jpeg;base64,${guardada.base64}`;
}

/** Devuelve la descripción sugerida por la IA o lanza un Error con un mensaje para el usuario. */
export async function describirFoto(uri: string): Promise<string> {
  const foto = await reducirFoto(uri);

  // invoke envía solo el token de la sesión actual (Authorization: Bearer ...)
  const { data, error } = await supabase.functions.invoke<{ descripcion: string }>('describir-foto', {
    body: { foto },
  });

  if (error instanceof FunctionsHttpError) {
    // 4xx / 5xx: el mensaje que armó la función está en el cuerpo
    const res = error.context as Response;
    let mensaje: string | undefined;
    try {
      mensaje = (await res.json())?.error;
    } catch {
      /* cuerpo no JSON */
    }
    if (res.status === 401) throw new Error('Tu sesión venció. Vuelve a iniciar sesión.');
    throw new Error(mensaje ?? `El servidor respondió con error ${res.status}.`);
  }
  if (error instanceof FunctionsFetchError) throw new Error('Sin conexión con el servidor.');
  if (error) throw new Error('No se pudo describir la foto.');
  if (!data?.descripcion) throw new Error('La IA no devolvió una descripción.');

  return data.descripcion;
}
