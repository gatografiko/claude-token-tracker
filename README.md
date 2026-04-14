# Monitor de Sesión Claude

> Supervisa en tiempo real el consumo de tokens y el coste de tus sesiones con Claude Code, directamente desde tu barra de estado. Creado con Claude Code para Claude Code.

![Version](https://img.shields.io/badge/versión-1.2.0-blue)
![VSCode](https://img.shields.io/badge/VSCode-1.85%2B-blue?logo=visualstudiocode)
![Licencia](https://img.shields.io/badge/licencia-MIT-green)
![Sin API Key](https://img.shields.io/badge/API%20Key-no%20requerida-success)
![Solo Local](https://img.shields.io/badge/datos-solo%20locales-success)

---

## Descripción

**Monitor de Sesión Claude** supervisa tus sesiones de [Claude Code](https://code.claude.com) en tiempo real leyendo los archivos JSONL locales que Claude Code escribe en `~/.claude/projects/`. Sin login. Sin navegador automatizado. Sin llamadas externas.

```text
✨ 45.2k tok | ctx 78% 🗄 | $0.0023
```

Haz clic en el ítem de la statusbar para abrir el panel de desglose completo, con actualización automática en cada respuesta.

---

## Novedades en v1.2.0

- **Reset automático al abrir nuevo chat** — Al detectar una nueva sesión de Claude Code, el panel y la barra de estado se reinician automáticamente a cero. Antes los tokens se acumulaban entre chats distintos. Los archivos JSONL anteriores permanecen intactos en disco.
- **Selector de modelo rediseñado** — El desplegable nativo `<select>` ha sido reemplazado por un selector custom con el estilo de Claude AI: botón con icono de color por modelo, nombre y subtítulo descriptivo, chevron animado, y panel desplegable con checkmark dorado en el modelo activo. Se cierra al hacer clic fuera.

---

## Novedades en v1.1.0

### Correcciones

- **Fix crítico en detección de sesión (Windows)** — La conversión de rutas `d:\` generaba `d-xampp-...` en lugar de `d--xampp-...`, impidiendo que la extensión encontrara el archivo JSONL. La sesión ahora se detecta correctamente en todos los casos.
- **Capacidad de Contexto corregida** — Antes acumulaba todos los tokens de la sesión (resultando en 0% disponible). Ahora usa el input del último mensaje, que refleja el tamaño real del contexto activo.

### Nuevas características

- **Panel en tiempo real** — El panel de desglose ya no es una instantánea estática. Se actualiza automáticamente con cada nuevo mensaje sin necesidad de cerrarlo y reabrirlo.
- **Integración con Caveman** — Nueva sección en el panel que detecta si tienes el skill [Caveman](https://github.com/JuliusBrussee/caveman) instalado:
  - Si está instalado: botón Activar/Desactivar que copia `/caveman` o `stop caveman` al portapapeles automáticamente. Tener en cuenta
  que se debe pegar el comando en el chat de Claude Code. El botón solo ejecuta el comando `copiar`.
  - Si no está instalado: botón que abre un terminal PowerShell y ejecuta la instalación global en `~/.claude/skills/caveman/`.
- **Tooltip dinámico** — La barra de estado ahora muestra tres estados distintos: esperando actividad, sesión activa y sesión recién actualizada.
- **Icono de extensión** — Identidad visual propia en el Marketplace y en la lista de extensiones instaladas.

### Cambios de nomenclatura

Todas las etiquetas del panel están ahora en español consistente:

| Antes | Ahora |
|-------|-------|
| Sesión Total | Resumen de Sesión |
| Último Mensaje | Última Interacción |
| Input / Output | Entrada / Salida |
| Cache creación | Escritura en Caché |
| Cache lectura | Lectura en Caché |
| Ventana de Contexto | Capacidad de Contexto |
| Restante | Disponible |
| Coste Estimado | Inversión Estimada |

---

## Características

- **Monitorización en tiempo real** — Se actualiza en cada respuesta de Claude Code mediante `fs.watch`
- **Panel en vivo** — El panel abierto se refresca automáticamente sin interacción
- **Detección automática de sesión** — Encuentra la sesión activa del workspace abierto
- **Desglose completo de tokens** — Entrada, salida, escritura en caché y lectura en caché
- **Capacidad de Contexto** — Indicador visual del contexto disponible (ventana de 200k tokens) basado en el último mensaje
- **Estimación de inversión** — En USD o EUR, basada en los precios oficiales de Anthropic
- **Estadísticas por interacción** — Tokens de la última interacción completada
- **Integración Caveman** — Detecta, instala y activa el skill Caveman desde el propio panel
- **Sin API key** — Funciona con cuentas Claude Pro/Max
- **Sin telemetría** — Todos los datos permanecen en tu equipo
- **Ligero** — Sin dependencias externas, 3 archivos

---

## Barra de estado

| Indicador | Significado |
|-----------|------------|
| `✨ 45.2k tok` | Total de tokens usados en la sesión |
| `ctx 78% 🗄` | Contexto disponible (verde > 50%) |
| `ctx 35% ⚠` | Advertencia de contexto (amarillo 20–50%) |
| `ctx 8% ⛔` | Contexto crítico (rojo < 20%) |
| `$0.0023` | Inversión estimada (USD o EUR) |

### Tooltip dinámico

| Estado | Texto |
|--------|-------|
| Sin actividad | `Monitor Claude — Esperando actividad...` |
| Sesión activa | `Monitor Claude — Ver desglose de la sesión` |
| Recién actualizado | `Sesión actualizada — Haz clic para detalles` |

---

## Panel de detalle

Haz clic en la statusbar para abrir el desglose completo. **Se actualiza en tiempo real** con cada nueva respuesta de Claude:

- **Resumen de Sesión** — totales por tipo de token (Entrada, Salida, Escritura en Caché, Lectura en Caché)
- **Última Interacción** — tokens de entrada y salida del último mensaje
- **Capacidad de Contexto** — barra de progreso visual + tokens usados y disponibles
- **Inversión Estimada** — coste de la sesión según el modelo seleccionado
- **Modo Caveman** — integración para activar/instalar el skill de compresión de tokens

---

## Instalación

### Opción A — Instalar como VSIX (recomendada)

**Requisitos:** paquete `vsce` y Node.js.

1. Instala `vsce` globalmente:
   ```bash
   npm install -g @vscode/vsce
   ```

2. Clona el repositorio y empaqueta:
   ```bash
   git clone https://github.com/gatografiko/claude-token-tracker.git
   cd claude-token-tracker
   vsce package
   ```
   Genera `claude-token-tracker-1.1.0.vsix`.

3. Instala en VSCode:

   ```text
   Extensiones (Ctrl+Shift+X) → menú ··· → Instalar desde VSIX → selecciona el archivo .vsix
   ```

4. Recarga VSCode. El ítem aparece automáticamente en la statusbar.

### Opción B — Modo desarrollo

1. Clona el repositorio y ábrelo en VSCode:
   ```bash
   git clone https://github.com/gatografiko/claude-token-tracker.git
   code claude-token-tracker
   ```

2. Pulsa `F5` — VSCode abre una ventana **Extension Development Host** con la extensión activa.

3. Abre tu proyecto en esa ventana. El ítem aparece en la parte inferior derecha.

---

## Configuración

Añade esto a tu `settings.json` de VSCode (`Ctrl+,` → abrir JSON):

```json
{
  "claudeTokenTracker.model": "sonnet",
  "claudeTokenTracker.currency": "EUR"
}
```

| Ajuste | Opciones | Por defecto | Descripción |
|--------|----------|-------------|-------------|
| `claudeTokenTracker.model` | `sonnet` `opus` `haiku` | `sonnet` | Modelo para el cálculo de inversión |
| `claudeTokenTracker.currency` | `USD` `EUR` | `USD` | Moneda de visualización |

---

## Comandos

Abre la paleta de comandos (`Ctrl+Shift+P`) y busca:

| Comando | Descripción |
|---------|-------------|
| `Monitor de Sesión Claude: Reset Session` | Reinicia todos los contadores de la sesión actual |
| `Monitor de Sesión Claude: Show Detail` | Abre el panel de desglose completo |

---

## Integración con Caveman

[Caveman](https://github.com/JuliusBrussee/caveman) es un skill para Claude Code que comprime las respuestas ~75% manteniendo la precisión técnica, ahorrando tokens de contexto significativamente.

El panel detecta automáticamente si lo tienes instalado:

- **Instalado** → botón Activar/Desactivar. Al activar, copia `/caveman` al portapapeles para pegarlo en Claude Code.
- **No instalado** → botón Instalar que abre un terminal PowerShell y ejecuta la instalación global automáticamente:

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\caveman"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/JuliusBrussee/caveman/main/caveman/SKILL.md" `
  -Headers @{"Accept"="text/plain"} `
  -OutFile "$env:USERPROFILE\.claude\skills\caveman\SKILL.md"
```

---

## Precios de referencia

Costes calculados en local (por millón de tokens):

| Modelo | Entrada | Salida | Escritura Caché | Lectura Caché |
|--------|---------|--------|-----------------|---------------|
| Sonnet | $3,00 | $15,00 | $3,75 | $0,30 |
| Opus   | $15,00 | $75,00 | $18,75 | $1,50 |
| Haiku  | $0,80 | $4,00 | $1,00 | $0,08 |

---

## Cómo funciona

1. Al activarse, lee `~/.claude/sessions/` para encontrar la sesión activa del workspace actual.
2. Localiza el archivo JSONL correspondiente en `~/.claude/projects/`.
3. Parsea cada mensaje `assistant` con `stop_reason` definido (respuestas completadas) para extraer los datos de `usage`.
4. Establece `fs.watch` sobre el archivo JSONL para detectar nuevas entradas en tiempo real.
5. Actualiza la statusbar y el panel abierto simultáneamente en cada nueva respuesta.
6. Escanea nuevas sesiones cada 5 segundos para gestionar reinicios de sesión.

Sin llamadas de red. Sin autenticación. Sin navegador.

---

## Requisitos

- VSCode 1.85 o superior
- Claude Code instalado y activo
- Cuenta Claude Pro, Max, Team o Enterprise

---

## Compatibilidad

| Sistema operativo | Estado |
|-------------------|--------|
| Windows | ✅ Probado |
| macOS | ✅ Compatible |
| Linux | ✅ Compatible |

---

## Hoja de ruta

- [ ] Publicar en el Marketplace de VSCode
- [ ] Detección automática del modelo desde el JSONL
- [ ] Gráfico de historial de sesiones
- [ ] Resumen de inversión diaria/semanal
- [ ] Notificación cuando el contexto alcanza nivel crítico
- [ ] Soporte para múltiples proyectos abiertos simultáneamente

---

## Contribuir

Issues y PRs son bienvenidos. Sin dependencias externas.

---

## Licencia

MIT © 2026
