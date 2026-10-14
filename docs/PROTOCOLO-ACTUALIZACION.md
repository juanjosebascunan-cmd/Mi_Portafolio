# Actualizar Mi_Portafolio con GPT, VS Code, GitHub y Base44

Este flujo actualiza el código del proyecto. No actualiza la instalación de Visual Studio Code. La web sigue siendo HTML, CSS y JavaScript estáticos. Para los controles se necesita Node.js 24 o superior; no hay paquetes que instalar.

## 1. Diagnóstico

Abrir la carpeta completa en VS Code. Revisar `git status`, la rama actual y el objetivo del cambio. Conservar el trabajo previo. Leer `quality.config.json` y ejecutar `npm run validate` antes de modificar archivos. Si una prueba ya falla, registrar el problema inicial.

La referencia original está en `benchmarks/baseline.json`. Contiene tamaños y hashes reales de los archivos del sitio. El informe registra el commit de partida y si había cambios locales; el hash de contenido identifica exactamente los archivos medidos.

## 2. Cambio con GPT

Usar el texto de `docs/PROMPT-GPT.md` con el asistente GPT del chat o de VS Code. Indicar un cambio concreto. Trabajar en una rama `codex/descripcion-del-cambio`, revisar los archivos afectados y mantener el cambio dentro del objetivo. Los comandos del proyecto no llaman a una API GPT: GPT participa mediante el asistente que ya utilizas.

## 3. Validación y benchmark

En VS Code: **Terminal → Ejecutar tarea → Proyecto: validar antes de GitHub**. También se puede ejecutar:

```sh
npm run validate
```

El comando comprueba referencias locales del HTML y CSS, anclas, identificadores duplicados, atributos básicos del documento, texto alternativo en imágenes y sintaxis de JavaScript. Ejecuta pruebas de los controles y compara el peso con la referencia. Una falla devuelve un código de salida distinto de cero.

`npm run benchmark` mide sin comparar. `npm run benchmark:compare` compara. Los informes se guardan en `reports/checks.json`, `reports/benchmark.json` y `reports/benchmark.md`.

Presupuestos iniciales: 1 MiB para el sitio completo, 512 KiB por archivo y hasta 10% de crecimiento total o por archivo respecto de la referencia. Incluye todos los archivos de las carpetas configuradas, incluso imágenes que la página no utiliza. Los saltos CRLF se normalizan a LF para que Windows y Linux sean comparables. El tamaño gzip es una estimación de compresión por archivo.

Esto es un benchmark estático de peso, no Terminal-Bench ni una medición de velocidad, Lighthouse, accesibilidad completa o ejecución del sitio en navegador. No comprueba disponibilidad de Google Fonts, Font Awesome, mapas ni otros servicios externos. Si cambió la interfaz, revisar en navegador el menú móvil, la navegación, las animaciones y el diseño en móvil/escritorio.

Cuando el aumento de contenido sea intencional, explicar el motivo y revisar `npm run benchmark:baseline` como parte del cambio. Nunca regenerar la referencia solo para ocultar una regresión. Las tareas de validación y GitHub no la sobrescriben.

## 4. GitHub

Revisar `git diff`, incluir solo los archivos del cambio y crear una propuesta de cambios (pull request). `.github/workflows/quality.yml` ejecuta las mismas comprobaciones en Windows y Linux al recibir la rama o el PR, y adjunta los informes durante 14 días.

GitHub ejecutará el flujo cuando el archivo esté en una rama remota. Crear el archivo local no significa que las pruebas remotas ya pasaron. La protección obligatoria de ramas se configura aparte en el repositorio; este flujo no la modifica. La integración y publicación final se deciden al revisar el PR.

## 5. Registro y recuperación

La app existente **PrintMate AI** guarda tres entidades, restringidas al administrador:

| Entidad | Contenido |
| --- | --- |
| DevProject | Repositorio, comando de validación y estado |
| UpdateProtocol | Los cinco protocolos de este documento |
| BenchmarkRun | Fecha, commit de partida, cambios locales, hash, tamaños y resultado |

Preparar un resultado nuevo con `npm run base44:export`. Después pedir en este chat: «Guarda el resultado de reports/base44-payload.json en PrintMate AI». El asistente debe consultar `BenchmarkRun` por `run_key` y crear el registro solo si no existe. Añadir la URL del PR si la hay. El comando exporta evidencia local; no transmite datos ni necesita claves. No hay sincronización automática ni panel nuevo en la interfaz de PrintMate AI: los registros se consultan en el apartado de datos de Base44 o mediante su conector.

Si hay un problema, guardar el diagnóstico y revertir el commit afectado mediante un nuevo cambio, volver a validar y registrar la nueva medición. No usar borrados ni restablecimientos que eliminen trabajo previo.

## Aplicarlo a otro proyecto

Copiar las herramientas, tareas y flujo de trabajo. Ajustar `quality.config.json` (nombre, repositorio, rutas, entrada y presupuestos) y `integrations/base44/project.json` (app y clave única). Crear una referencia propia y un registro DevProject nuevo. Estos controles sirven para sitios estáticos; proyectos React, Python u otros requieren además sus pruebas y compilación propias.

Referencias: [tareas de VS Code](https://code.visualstudio.com/docs/debugtest/tasks), [checkout](https://github.com/actions/checkout), [Node en GitHub Actions](https://github.com/actions/setup-node), [informes de Actions](https://github.com/actions/upload-artifact).
