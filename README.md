# GeoCam ve 📍📷✨ (Semana 10)

Taller en clase de la **Semana 10: GeoCam ve**. La GeoCam sincronizada de la Semana 9 aprende a describir sus fotos con IA.
La descripción se guarda en SQLite y viaja a Supabase con la misma sincronización.

**La app nunca habla con Gemini.** Llama a la Edge Function `describir-foto` con `supabase.functions.invoke` (que envía el token de sesión); la key `GEMINI_API_KEY` solo existe en los secretos de la función.

```text
Foto (varios MB) → reducir 1024 px JPEG 0.7 (~150 KB) → Edge Function (valida token, límite diario)
  → Gemini (1-2 frases) → pantalla: sugerencia editable → Guardar → SQLite (updatedAt cambia, queda pendiente)
  → sync push (upsert) → Supabase → el otro teléfono la baja en su pull
```

## Puesta en marcha de la Semana 10

Proyecto en **Expo SDK 58** (Expo Go de la tienda). Las Edge Functions `describir-foto`, `tutor` y `tarjetas` ya están desplegadas en el proyecto de Supabase.

1. **SQL.** En el SQL Editor ejecuta `supabase/instalar-todo.sql` una sola vez: crea `photos` (Semanas 8 y 9), `ai_description`, la tabla `uso_ia` del límite diario y el bucket privado `geocam`.
2. **Key de Gemini.** En Supabase › Edge Functions › **Secrets** agrega `GEMINI_API_KEY` (opcionales: `LIMITE_DIARIO`, `GEMINI_MODEL`). La key nunca va en `.env` ni en el código.
3. **Auth.** En Authentication › Sign In / Providers › Email desactiva *Confirm email* para probar en clase.
4. **App.** `npm install`, crea `.env` desde `.env.example` y `npx expo start -c`. La migración local nueva (`drizzle/0001_…sql`, un `ALTER TABLE`) se aplica sola al abrir: tus fotos anteriores se conservan.

Con la CLI también funciona: `npx supabase login`, `npx supabase link --project-ref TU_REF`, `npx supabase secrets set GEMINI_API_KEY=...` y `npx supabase functions deploy describir-foto`.

## Pestañas nuevas: Asistente y Cuenta

- **Asistente** (`app/(tabs)/asistente.tsx`): chat en streaming con la Edge Function `asistente`. Con cada pregunta la app envía un resumen de tus últimas 60 fotos (fecha, nota, descripción de IA, coordenadas redondeadas, favorita y álbum) y **nunca las imágenes**. El servidor valida ese resumen con zod y cuenta el uso en `uso_ia`. Trae sugerencias como "Resume mis fotos de esta semana" o "Sugiere notas para mis fotos sin nota", botón ■ para detener, Reintentar y aviso sin conexión.
- **Cuenta** (`app/(tabs)/cuenta.tsx`): correo de la sesión, resumen de tus fotos, estado de la nube y **Cerrar sesión** con confirmación.
- **Login** (`app/login.tsx`): modos Iniciar sesión / Crear cuenta, ver u ocultar la contraseña, confirmación de contraseña y errores de Supabase traducidos al español.

## Requisitos del taller (Semana 10)

| # | Requisito | Dónde | Cómo lo compruebas |
| --- | --- | --- | --- |
| T1 | Edge Function `describir-foto`: recibe data URL JPEG, responde `{ descripcion }`, usa `GEMINI_API_KEY` | `supabase/functions/describir-foto/index.ts` | `curl` sin token → **401** |
| T2 | `services/vision.ts`: reduce a 1024 px JPEG 0.7 y llama con `supabase.functions.invoke` | `services/vision.ts` | La petición pesa < 300 KB (la función rechaza > ~300 KB con 413) |
| T3 | Columna `ai_description` en SQLite (migración nueva, sin borrar `drizzle/`) y en Supabase | `db/schema.ts`, `drizzle/0001_*.sql`, `supabase/semana10.sql` | Tus fotos anteriores siguen en la app |
| T4 | Botón ✨ en el detalle con spinner; apagado y con aviso sin red | `app/foto/[id].tsx` | Modo avión |
| T5 | Al guardar, `updatedAt` cambia y queda pendiente; sube y baja en otro teléfono | `photosRepo.setDescription`, push/pull en `services/sync.ts` | Columna en Table Editor |
| T6 | Descripción editable (sugerencia) + aviso "se envía a Google" | `app/foto/[id].tsx` | Edita sin red y sincroniza después |
| Extra | La lista muestra las primeras palabras de la descripción si no hay nota | `app/(tabs)/fotos.tsx` | |

## Cambio necesario en `db/schema.ts`

`npm run db:generate` fallaba con `Transform failed … react-native/index.js: Unexpected "typeof"`: el esquema importaba `expo-crypto` arriba del archivo y `drizzle-kit` intentaba leer React Native. Ahora `expo-crypto` se carga dentro de `$defaultFn`, que solo se ejecuta en el teléfono.

---

# GeoCam sincronizada 📍📷🔄 (Semana 9)

Solución de referencia del **Taller en clase de la Semana 9: GeoCam sincronizada**.
Programación Móvil Avanzada · Universidad de La Guajira.

La app trabaja normal sin conexión. Cuando vuelve la red, sube sola lo pendiente y baja lo que se creó o editó en otro teléfono con la misma cuenta.

**Versiones:** Expo SDK 58 · Drizzle ORM 0.45 · supabase-js 2 · TanStack Query 5 · expo-network.

## Cómo ejecutarlo

1. **Supabase.** En el SQL Editor ejecuta `supabase/schema.sql` (Semana 8) y después `supabase/semana9.sql`.
2. **Credenciales.** Copia `.env.example` como `.env`.
3. **Instalar, generar la migración y correr.**

   ```bash
   npm install
   npx expo install --fix
   npm run db:generate
   npx expo start -c
   ```

> Este proyecto usa su propia base local (`geocam-sync.db`), así que puedes generar la migración desde cero sin chocar con datos anteriores del teléfono.

## Diseño de la sincronización

1. **SQLite es la fuente de verdad.** La app siempre lee y escribe en local.
2. **Identidad compartida:** cada foto tiene un `clientId` (UUID).
3. **Pendiente** = `syncedAt` vacío o anterior a `updatedAt`.
4. **Cursor de bajada** por usuario, guardado en la tabla local `sync_meta`.
5. **Conflictos:** gana el último cambio (`updatedAt` más reciente).

Cada ciclo (`syncAll` en `services/sync.ts`) hace dos pasos, en este orden:

```text
1. BAJAR   filas con server_updated_at > cursor
           ├─ no existe en local        → descargar archivo + insertar
           ├─ remota más nueva          → actualizar local
           └─ local más nueva           → no tocar (se sube en el paso 2)
2. SUBIR   fotos pendientes
           ├─ archivo (solo la primera vez; "ya existe" se tolera)
           ├─ upsert por client_id
           └─ syncedAt = updatedAt que se subió
```

| Columna remota | Quién la escribe | Para qué sirve |
| --- | --- | --- |
| `updated_at` | El teléfono | Decidir quién gana un conflicto |
| `server_updated_at` | PostgreSQL (trigger) | Cursor de bajada |

## Cuándo se dispara

`hooks/useSync.ts` trata la sincronización como una consulta de TanStack Query:

| Disparador | Cómo |
| --- | --- |
| Al iniciar sesión o abrir la app | `enabled: !!userId` |
| Al recuperar la red | `refetchOnReconnect: 'always'` + `onlineManager` |
| Al volver a primer plano | `refetchOnWindowFocus: 'always'` + `focusManager` |
| Después de cada cambio local | `requestSync()` en `hooks/usePhotos.ts` |
| A mano | Tocar el indicador de estado |

## Requisitos del taller

- [x] **T1. Backend:** `supabase/semana9.sql`.
- [x] **T2. TanStack Query:** `lib/queryClient.ts` y `QueryClientProvider` en `app/_layout.tsx`.
- [x] **T3. Soporte local:** tabla `sync_meta`, `db/repositories/syncMeta.ts` y los métodos nuevos de `photosRepo`.
- [x] **T4. Bajar:** `pull` en `services/sync.ts`.
- [x] **T5. Subir:** `push` en `services/sync.ts`.
- [x] **T6. Disparo automático y estado:** `hooks/useSync.ts` y `components/SyncBadge.tsx` (en GeoCam y en Fotos).
- [ ] **T7. Verificación:** hazla tú con dos teléfonos (abajo).

## Dos mejoras frente al código de la guía

- **Un solo ciclo a la vez.** Si se pide sincronizar mientras hay un ciclo en curso, se reutiliza en lugar de lanzar otro en paralelo.
- **Repetición corta.** Si el usuario editó algo durante el ciclo, se da hasta dos vueltas más para no dejar ese cambio esperando.

## Pruebas en dos teléfonos

- [ ] **Sin conexión.** Modo avión, toma dos fotos y edita una nota. El indicador muestra las pendientes. Quita el modo avión: se suben solas y pasa a "Al día".
- [ ] **Dos teléfonos.** Inicia sesión con la misma cuenta en otro teléfono. Las fotos aparecen con imagen y ubicación en el mapa.
- [ ] **Conflicto.** Con ambos en modo avión, edita la nota de la misma foto, primero en A y un minuto después en B. Reconecta ambos: en los dos queda la nota de B.
- [ ] **Sin duplicados.** Toca el indicador varias veces seguidas: en Supabase sigue habiendo una fila y un archivo por foto.

## Qué se probó de forma automática

El archivo real `services/sync.ts` se ejecutó contra dos teléfonos y un servidor simulados. Pasaron estos escenarios: subir una foto pendiente, verla aparecer en el otro teléfono, repetir sin duplicar, conflicto en los dos órdenes de sincronización, reintento después de una falla a mitad de la subida, edición hecha durante la subida y llamadas simultáneas. No se probó en un teléfono ni contra un proyecto real de Supabase.

## Limitaciones conocidas (trabajo para la casa)

- **Los borrados no se sincronizan.** Borrar una foto, o agitar para borrar todo, solo borra en el teléfono. La foto sigue en la nube y vuelve a aparecer en un teléfono nuevo. Tarea C1 (borrado lógico).
- **Si una foto falla al subir, el ciclo se detiene** y se reintenta completo. Esto incluye las fotos antiguas cuyo archivo ya no existe en la caché. Tarea C5.
- **Solo se sincronizan nota, favorita y descripción de IA.** Los álbumes son locales.
- **Las fotos locales no se separan por usuario** (tarea C5 de la Semana 8).
- Con más de 200 cambios en la nube, el resto llega en el ciclo siguiente.

## Documentación

- [TanStack Query en React Native](https://tanstack.com/query/latest/docs/framework/react/react-native)
- [Modos de red](https://tanstack.com/query/latest/docs/framework/react/guides/network-mode)
- [Expo Network](https://docs.expo.dev/versions/latest/sdk/network/)
- [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/)
