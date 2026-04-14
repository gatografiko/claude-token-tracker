# Claude Token Tracker

> Monitor de uso de tokens en tiempo real para Claude Code — directamente en la barra de estado de VSCode.

![Version](https://img.shields.io/badge/versión-1.0.0-blue)
![VSCode](https://img.shields.io/badge/VSCode-1.85%2B-blue?logo=visualstudiocode)
![Licencia](https://img.shields.io/badge/licencia-MIT-green)
![Sin API Key](https://img.shields.io/badge/API%20Key-no%20requerida-success)
![Solo Local](https://img.shields.io/badge/datos-solo%20locales-success)

---

## Descripción

**Claude Token Tracker** monitoriza tus sesiones de [Claude Code](https://code.claude.com) en tiempo real leyendo los archivos JSONL locales que Claude Code escribe en `~/.claude/projects/`. Sin login. Sin navegador automatizado. Sin llamadas externas.

```
✨ 45.2k tok | ctx 78% 🗄 | $0.0023
```

Haz click en el ítem de la statusbar para abrir el panel de desglose completo.

---

## Características

- **Monitorización en tiempo real** — Se actualiza en cada respuesta de Claude Code mediante `fs.watch`
- **Detección automática de sesión** — Encuentra automáticamente la sesión activa del workspace abierto
- **Desglose completo de tokens** — Input, output, creación de caché y lectura de caché
- **Ventana de contexto** — Indicador visual del contexto restante (ventana de 200k tokens)
- **Estimación de coste** — En USD o EUR, basada en los precios oficiales de Anthropic
- **Estadísticas por mensaje** — Tokens de input/output del último mensaje
- **Sin API key** — Funciona con cuentas Claude Pro/Max
- **Sin telemetría** — Todos los datos permanecen en tu equipo
- **Ligero** — Sin dependencias externas, 3 archivos, ~6KB

---

## Barra de estado

| Indicador | Significado |
|-----------|------------|
| `✨ 45.2k tok` | Total de tokens usados en la sesión |
| `ctx 78% 🗄` | Contexto restante (verde > 50%) |
| `ctx 35% ⚠` | Advertencia de contexto (amarillo 20–50%) |
| `ctx 8% ⛔` | Contexto crítico (rojo < 20%) |
| `$0.0023` | Coste estimado (USD o EUR) |

---

## Panel de detalle

Haz click en la statusbar para abrir el desglose completo:

- Totales de sesión por tipo de token
- Input/output del último mensaje
- Barra de progreso visual de la ventana de contexto
- Desglose de coste por modelo

---

## Instalación

### Opción A — Modo desarrollo (recomendada)

**Requisitos:** VSCode 1.85+ y Node.js instalado.

1. Clona o descarga este repositorio:
   ```bash
   git clone https://github.com/TU_USUARIO/claude-token-tracker.git
   ```

2. Abre la carpeta en VSCode:
   ```
   File → Open Folder → selecciona claude-token-tracker
   ```

3. Pulsa `F5` — VSCode abre una ventana **Extension Development Host** con la extensión activa.

4. Abre tu proyecto en esa nueva ventana. El ítem aparece automáticamente en la parte inferior derecha.

### Opción B — Instalar como VSIX (instalación permanente)

**Requisitos:** paquete `vsce`.

1. Instala `vsce` globalmente:
   ```bash
   npm install -g @vscode/vsce
   ```

2. Dentro de la carpeta de la extensión, empaquétala:
   ```bash
   vsce package
   ```
   Esto genera `claude-token-tracker-1.0.0.vsix`.

3. Instala en VSCode:
   ```
   Extensiones (Ctrl+Shift+X) → menú ··· → Instalar desde VSIX → selecciona el archivo .vsix
   ```

4. Recarga VSCode. El ítem aparece automáticamente en la statusbar.

### Opción C — Windows PowerShell (instalación rápida)

```powershell
# Clona el repositorio
git clone https://github.com/TU_USUARIO/claude-token-tracker.git
cd claude-token-tracker

# Abre en VSCode
code .
```
Luego pulsa `F5`.

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
| `claudeTokenTracker.model` | `sonnet` `opus` `haiku` | `sonnet` | Modelo para el cálculo de coste |
| `claudeTokenTracker.currency` | `USD` `EUR` | `USD` | Moneda de visualización |

---

## Comandos

Abre la paleta de comandos (`Ctrl+Shift+P`) y busca:

| Comando | Descripción |
|---------|-------------|
| `Claude Token Tracker: Reset Session` | Reinicia todos los contadores de la sesión actual |
| `Claude Token Tracker: Show Detail` | Abre el panel de desglose completo |

---

## Precios de referencia

Los costes se calculan en local usando estas tarifas (por millón de tokens):

| Modelo | Input | Output | Creación caché | Lectura caché |
|--------|-------|--------|----------------|---------------|
| Sonnet | $3,00 | $15,00 | $3,75 | $0,30 |
| Opus   | $15,00 | $75,00 | $18,75 | $1,50 |
| Haiku  | $0,80 | $4,00 | $1,00 | $0,08 |

---

## Cómo funciona

1. Al activarse, lee `~/.claude/sessions/` para encontrar la sesión activa del workspace actual.
2. Localiza el archivo JSONL correspondiente en `~/.claude/projects/`.
3. Parsea cada mensaje `assistant` con `stop_reason` definido (respuestas completadas) para extraer los datos de `usage`.
4. Establece `fs.watch` sobre el archivo JSONL para detectar nuevas entradas en tiempo real.
5. Escanea nuevas sesiones cada 5 segundos para gestionar reinicios de sesión.

Sin llamadas de red. Sin autenticación. Sin navegador.

---

## Requisitos

- VSCode 1.85 o superior
- Extensión Claude Code instalada y activa
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
- [ ] Resumen de coste diario/semanal
- [ ] Notificación cuando el contexto alcanza nivel crítico
- [ ] Soporte para múltiples proyectos abiertos simultáneamente

---

## Contribuir

Issues y PRs son bienvenidos. Sin dependencias externas.

---

## Licencia

MIT © 2026
