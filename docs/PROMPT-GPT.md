# Solicitud reutilizable para GPT

Actualiza este proyecto con el siguiente objetivo: **[describir el cambio]**.

1. Lee `docs/PROTOCOLO-ACTUALIZACION.md`, `quality.config.json` y el estado de Git. Conserva los cambios que ya existan y registra el resultado inicial de `npm run validate`.
2. Implementa el objetivo en una rama `codex/` y explica las decisiones relevantes. No cambies el diseño o contenido fuera del alcance pedido.
3. Ejecuta `npm run validate`. Si falla, corrige la causa. No aumentes presupuestos ni reemplaces la referencia para esconder una regresión. Si hay cambios visuales, verifica el sitio en móvil y escritorio.
4. Revisa el diff y prepara un PR con el cambio, las comprobaciones reales y cualquier límite pendiente. Indica por separado qué se verificó localmente y qué pasó en GitHub.
5. Ejecuta `npm run base44:export`. Con el conector Base44, consulta primero el esquema y busca el `run_key` en BenchmarkRun de la app indicada en `integrations/base44/project.json`. Guarda el resultado una sola vez y añade el enlace del PR. Si el conector no está disponible, conserva el archivo y declara que falta el envío.

Entrega un resumen breve con el resultado, evidencia, enlaces y pasos pendientes. Nunca declares una prueba, envío, integración o publicación como completados sin haberlo comprobado.
