# 🤖 Registro de Auditoría de IA (AI-LOG)

**Estudiante(s):** Nombre Apellido, Nombre Apellido
**Semana:** 10
**Proyecto:** GeoCam ve – Taller Integrador 2

## 1. Prompts Utilizados

- "Puedes migrar todo esto para el proyecto de GeoCam" (asistente de código Claude, 13-nov-2026), después de construir el Tutor IA.
- _Agrega aquí tus propios prompts._

## 2. Código Generado vs. Código Modificado

- **¿Qué generó la IA?:** Edge Function `describir-foto` (con límite diario `uso_ia`), `services/vision.ts`, columna `aiDescription` + migración `0001` (ALTER TABLE), `photosRepo.setDescription`, campo `ai_description` en push y pull, sección "Descripción con IA" en el detalle y la vista previa en la lista.
- **¿Qué modifiqué/corregí?:** _completa tras probar en tu teléfono._

## 3. Alucinaciones o Errores Detectados

- **`db:generate` no funcionaba en el proyecto de referencia.** `db/schema.ts` importaba `expo-crypto` al inicio; `drizzle-kit` carga el esquema con esbuild en Node y falla al llegar a `react-native/index.js` (`Unexpected "typeof"`). Se corrigió cargando `expo-crypto` dentro de `$defaultFn`.
- **Búsqueda mal escapada al verificar el bundle.** La IA concluyó primero que la migración no estaba en el bundle porque el `grep` tenía las comillas invertidas mal escapadas; al repetir la búsqueda sí apareció `ALTER TABLE \`photos\` ADD \`ai_description\``. Lección: verificar la verificación.
- Típico de esta semana (a vigilar): la IA sugiere `EXPO_PUBLIC_GEMINI_API_KEY` y llamar a Gemini desde la app → se corrige usando la Edge Function.

### Actualización a Expo SDK 58 (16-nov-2026)

El Expo Go de la tienda ya solo abre SDK 58, así que el proyecto se actualizó con `npx expo install expo@^58.0.0 --fix`. `tsc` encontró lo que se rompió:

- **Íconos de las pestañas:** en SDK 58 el `color` de `tabBarIcon` llega como `ColorValue` (puede ser `null`) e `Ionicons` solo acepta `string`. Se agregó un helper `icono()` en `app/(tabs)/_layout.tsx`.
- **`import '../global.css'`:** TypeScript 6 exige declarar los imports de efecto secundario. Se agregó `types/css.d.ts`.
- **`expo-font` faltaba:** `expo-doctor` lo marcó como dependencia par de `@expo/vector-icons`.

### Error detectado al revisar la subida (16-nov-2026)

- `push` leía la foto con `fetch(photo.uri)`. El `fetch` de React Native no siempre lee rutas `file://` en Android, así que la subida podía fallar. Se cambió por `new File(photo.uri).arrayBuffer()` de `expo-file-system`, la misma API que usa el resto del proyecto.
- Al editar el README, la IA metió acentos graves (\`) dentro de un comando de bash entre comillas dobles; bash los interpretó como sustitución de comandos y la sección quedó con huecos. Se detectó al revisar la salida y se reescribió con un heredoc entre comillas simples. Ningún comando sustituido modificó archivos ni Supabase.
