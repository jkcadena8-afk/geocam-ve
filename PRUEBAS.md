# Pruebas — GeoCam ve (Semana 10)

Marca ✅ / ❌ en **Resultado**. Las filas *verificado* ya se comprobaron en el computador.

## Automáticas (computador)

| # | Prueba | Esperado | Resultado |
| --- | --- | --- | --- |
| A1 | `npx tsc --noEmit` | Sin errores | ✅ verificado 13-nov |
| A2 | `npx deno check --no-config supabase/functions/describir-foto/index.ts` | Sin errores | ✅ verificado 13-nov |
| A3 | `npm run db:generate` produce `0001_*.sql` con `ALTER TABLE \`photos\` ADD \`ai_description\` text;` | Solo un ALTER | ✅ verificado 13-nov |
| A4 | Bundle Android sin bytecode: buscar `AIza` | 0 | ✅ verificado 13-nov |

## En el teléfono

| # | Requisito | Pasos | Esperado | Resultado |
| --- | --- | --- | --- | --- |
| P1 | T1 | `curl -i -X POST https://TU_REF.supabase.co/functions/v1/describir-foto -d '{"foto":"x"}'` | 401 | |
| P2 | T3 | Abrir la app con fotos de la Semana 9 | Siguen todas | |
| P3 | T2/T4 | Detalle → ✨ Describir con IA | Spinner y luego 1-2 frases en el cuadro | |
| P4 | T4 | Modo avión → detalle | Botón gris + aviso "Sin conexión" | |
| P5 | T6 | Corregir el texto → Guardar descripción | Se guarda; la foto queda "Pendiente de subir" | |
| P6 | T6 | En modo avión editar y guardar; quitar modo avión | Se sube sola; badge "Al día" | |
| P7 | T5 | Table Editor > photos | `ai_description` con el texto | |
| P8 | T5 | Otro teléfono, misma cuenta | Baja la descripción | |
| P9 | Límite | `secrets set LIMITE_DIARIO=3`, describir 4 veces | La 4.ª: "Llegaste al límite…" | |
| P10 | Extra | Pestaña Fotos, foto sin nota | Muestra "✨ primeras palabras…" | |
