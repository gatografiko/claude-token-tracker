const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Precios por millón de tokens (USD) - Claude Sonnet 4.6
const PRICING = {
  sonnet: { input: 3.00, output: 15.00, cache_creation: 3.75, cache_read: 0.30 },
  opus:   { input: 15.00, output: 75.00, cache_creation: 18.75, cache_read: 1.50 },
  haiku:  { input: 0.80, output: 4.00, cache_creation: 1.00, cache_read: 0.08 }
};

const EUR_RATE = 0.92;
const CONTEXT_WINDOW = 200000;

let statusBarItem;
let detailPanel = null;
let cavemanActive = false;
let fileWatchers = new Map();
let sessionData = {
  totalInput: 0,
  totalOutput: 0,
  totalCacheCreation: 0,
  totalCacheRead: 0,
  lastMessageInput: 0,
  lastMessageOutput: 0,
  messageCount: 0,
  sessionFile: null,
  processedLines: new Set(),
  lastUpdateTime: 0
};

function getClaudeProjectsPath() {
  return path.join(os.homedir(), '.claude', 'projects');
}

function getClaudeSessionsPath() {
  return path.join(os.homedir(), '.claude', 'sessions');
}

function isCavemanInstalled() {
  return fs.existsSync(path.join(os.homedir(), '.claude', 'skills', 'caveman', 'SKILL.md'));
}

function cwdToProjectFolder(cwd) {
  // Convierte d:\xampp\htdocs\sure → d--xampp-htdocs-sure
  return cwd.replace(/[:\\\/]/g, '-').replace(/^-/, '');
}

function findActiveSessionFile(workspacePath) {
  try {
    const sessionsDir = getClaudeSessionsPath();
    if (!fs.existsSync(sessionsDir)) return null;

    const sessionFiles = fs.readdirSync(sessionsDir)
      .map(f => ({ name: f, full: path.join(sessionsDir, f) }))
      .filter(f => f.name.endsWith('.json'))
      .map(f => {
        try {
          const data = JSON.parse(fs.readFileSync(f.full, 'utf8'));
          return { ...f, data, mtime: fs.statSync(f.full).mtimeMs };
        } catch { return null; }
      })
      .filter(f => f && f.data && f.data.cwd)
      .filter(f => f.data.cwd.toLowerCase() === workspacePath.toLowerCase())
      .sort((a, b) => b.mtime - a.mtime);

    if (sessionFiles.length === 0) return null;

    const session = sessionFiles[0].data;
    const projectFolder = cwdToProjectFolder(session.cwd);
    const projectPath = path.join(getClaudeProjectsPath(), projectFolder);

    if (!fs.existsSync(projectPath)) return null;

    // Buscar el JSONL de esta sesión
    const jsonlPath = path.join(projectPath, `${session.sessionId}.jsonl`);
    if (fs.existsSync(jsonlPath)) return jsonlPath;

    // Buscar el más reciente si no hay match exacto
    const jsonlFiles = fs.readdirSync(projectPath)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({ f, mtime: fs.statSync(path.join(projectPath, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);

    return jsonlFiles.length > 0 ? path.join(projectPath, jsonlFiles[0].f) : null;
  } catch (e) {
    return null;
  }
}

function parseTokensFromJsonl(filePath) {
  if (!fs.existsSync(filePath)) return;

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());

    let newMessages = false;

    for (const line of lines) {
      if (sessionData.processedLines.has(line)) continue;

      try {
        const obj = JSON.parse(line);

        if (obj.type === 'assistant' && obj.message && obj.message.usage) {
          const u = obj.message.usage;
          const msgInput = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
          const msgOutput = u.output_tokens || 0;

          // Solo contar mensajes finales (stop_reason presente)
          if (obj.message.stop_reason) {
            sessionData.totalInput += u.input_tokens || 0;
            sessionData.totalOutput += u.output_tokens || 0;
            sessionData.totalCacheCreation += u.cache_creation_input_tokens || 0;
            sessionData.totalCacheRead += u.cache_read_input_tokens || 0;
            sessionData.lastMessageInput = msgInput;
            sessionData.lastMessageOutput = msgOutput;
            sessionData.messageCount++;
            sessionData.processedLines.add(line);
            newMessages = true;
          }
        }
      } catch { /* skip malformed lines */ }
    }

    if (newMessages) {
      sessionData.lastUpdateTime = Date.now();
      updateStatusBar();
    }
  } catch (e) { /* file read error */ }
}

function calcCost(data, model, currency) {
  const p = PRICING[model] || PRICING.sonnet;
  const rate = currency === 'EUR' ? EUR_RATE : 1;

  const cost = (
    (data.totalInput * p.input / 1_000_000) +
    (data.totalOutput * p.output / 1_000_000) +
    (data.totalCacheCreation * p.cache_creation / 1_000_000) +
    (data.totalCacheRead * p.cache_read / 1_000_000)
  ) * rate;

  return cost;
}

function formatTokens(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

function updateStatusBar() {
  const config = vscode.workspace.getConfiguration('claudeTokenTracker');
  const model = config.get('model', 'sonnet');
  const currency = config.get('currency', 'USD');
  const symbol = currency === 'EUR' ? '€' : '$';

  const totalTokens = sessionData.totalInput + sessionData.totalOutput +
    sessionData.totalCacheCreation + sessionData.totalCacheRead;
  const contextUsed = sessionData.lastMessageInput;
  const remaining = Math.max(0, CONTEXT_WINDOW - contextUsed);
  const cost = calcCost(sessionData, model, currency);
  const remainingPct = Math.max(0, Math.round((remaining / CONTEXT_WINDOW) * 100));

  // Icono de contexto según nivel
  const ctxIcon = remainingPct > 50 ? '$(database)' :
                  remainingPct > 20 ? '$(warning)' : '$(error)';

  statusBarItem.text = `$(sparkle) ${formatTokens(totalTokens)} tok | ctx ${remainingPct}% ${ctxIcon} | ${symbol}${cost.toFixed(4)}`;

  const sinceUpdate = Date.now() - sessionData.lastUpdateTime;
  if (sessionData.messageCount === 0) {
    statusBarItem.tooltip = 'Monitor Claude — Esperando actividad...';
  } else if (sinceUpdate < 4000) {
    statusBarItem.tooltip = 'Sesión actualizada — Haz clic para detalles';
  } else {
    statusBarItem.tooltip = 'Monitor Claude — Ver desglose de la sesión';
  }

  statusBarItem.show();

  if (detailPanel) {
    detailPanel.webview.html = buildPanelHtml();
  }
}


function resetSession() {
  sessionData = {
    totalInput: 0, totalOutput: 0,
    totalCacheCreation: 0, totalCacheRead: 0,
    lastMessageInput: 0, lastMessageOutput: 0,
    messageCount: 0, sessionFile: null,
    processedLines: new Set(), lastUpdateTime: 0
  };
  updateStatusBar();
  vscode.window.showInformationMessage('Monitor de Sesión Claude: sesión reiniciada');
}

function buildPanelHtml() {
  const config = vscode.workspace.getConfiguration('claudeTokenTracker');
  const model = config.get('model', 'sonnet');
  const currency = config.get('currency', 'USD');
  const symbol = currency === 'EUR' ? '€' : '$';
  const cost = calcCost(sessionData, model, currency);
  const remaining = Math.max(0, CONTEXT_WINDOW - sessionData.lastMessageInput);

  return `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
  h2 { color: #d97706; border-bottom: 1px solid #333; padding-bottom: 8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
  .card { background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 8px; padding: 16px; }
  .card h3 { margin: 0 0 12px; font-size: 0.85em; text-transform: uppercase; opacity: 0.7; }
  .big { font-size: 2em; font-weight: bold; color: #f59e0b; }
  .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 0.9em; }
  .bar-bg { background: #333; border-radius: 4px; height: 8px; margin-top: 8px; }
  .bar { background: ${remaining / CONTEXT_WINDOW > 0.5 ? '#22c55e' : remaining / CONTEXT_WINDOW > 0.2 ? '#f59e0b' : '#ef4444'}; height: 8px; border-radius: 4px; width: ${Math.max(0, (remaining / CONTEXT_WINDOW) * 100).toFixed(1)}%; }
</style>
</head>
<body>
<h2>🪨 Monitor de Sesión Claude</h2>
<div class="grid">
  <div class="card">
    <h3>Resumen de Sesión</h3>
    <div class="big">${(sessionData.totalInput + sessionData.totalOutput + sessionData.totalCacheCreation + sessionData.totalCacheRead).toLocaleString()}</div>
    <div style="opacity:0.6;font-size:0.8em">tokens consumidos</div>
    <div class="row" style="margin-top:12px"><span>Entrada</span><span>${sessionData.totalInput.toLocaleString()}</span></div>
    <div class="row"><span>Salida</span><span>${sessionData.totalOutput.toLocaleString()}</span></div>
    <div class="row"><span>Escritura en Caché</span><span>${sessionData.totalCacheCreation.toLocaleString()}</span></div>
    <div class="row"><span>Lectura en Caché</span><span>${sessionData.totalCacheRead.toLocaleString()}</span></div>
    <div class="row"><span>Mensajes</span><span>${sessionData.messageCount}</span></div>
  </div>
  <div class="card">
    <h3>Última Interacción</h3>
    <div class="row"><span>Entrada</span><span>${sessionData.lastMessageInput.toLocaleString()}</span></div>
    <div class="row"><span>Salida</span><span>${sessionData.lastMessageOutput.toLocaleString()}</span></div>
  </div>
  <div class="card">
    <h3>Capacidad de Contexto</h3>
    <div class="big">${Math.max(0, Math.round((remaining / CONTEXT_WINDOW) * 100))}%</div>
    <div style="opacity:0.6;font-size:0.8em">disponible</div>
    <div class="bar-bg"><div class="bar"></div></div>
    <div class="row" style="margin-top:8px"><span>Usado</span><span>${(CONTEXT_WINDOW - remaining).toLocaleString()}</span></div>
    <div class="row"><span>Disponible</span><span>${Math.max(0, remaining).toLocaleString()}</span></div>
    <div class="row"><span>Total contexto</span><span>${CONTEXT_WINDOW.toLocaleString()}</span></div>
  </div>
  <div class="card">
    <h3>Inversión Estimada (${model})</h3>
    <div class="big">${symbol}${cost.toFixed(4)}</div>
    <div style="opacity:0.6;font-size:0.8em">esta sesión</div>
  </div>
  <div class="card" style="grid-column: 1 / -1; border-top: 1px solid #444; padding-top: 16px;">
    <h3>🪨 Modo Caveman</h3>
    <p style="font-size:0.85em;opacity:0.7;margin:4px 0 14px">Comprime respuestas de Claude ~75% manteniendo precisión técnica.</p>
    ${isCavemanInstalled() ? `
    <div style="display:flex;align-items:center;gap:12px">
      <span style="font-size:0.9em">${cavemanActive ? '● <strong>Activo</strong>' : '○ Inactivo'}</span>
      <button onclick="sendMsg('toggleCaveman')" style="padding:6px 16px;border:none;border-radius:6px;cursor:pointer;font-size:0.9em;background:${cavemanActive ? '#dc2626' : '#d97706'};color:#fff">
        ${cavemanActive ? 'Desactivar' : 'Activar Caveman'}
      </button>
    </div>
    <p style="font-size:0.8em;opacity:0.6;margin-top:8px">
      ${cavemanActive ? 'Comando copiado — pégalo en Claude Code para activar' : 'Al activar, copia <code>/caveman</code> al portapapeles automáticamente'}
    </p>
    ` : `
    <div style="display:flex;align-items:center;gap:12px">
      <span style="font-size:0.9em;opacity:0.7">No instalado</span>
      <button onclick="sendMsg('installCaveman')" style="padding:6px 16px;border:none;border-radius:6px;cursor:pointer;font-size:0.9em;background:#16a34a;color:#fff">
        Instalar Caveman
      </button>
    </div>
    <p style="font-size:0.8em;opacity:0.6;margin-top:8px">Se instalará globalmente en ~/.claude/skills/caveman/ via terminal</p>
    `}
  </div>
</div>
<script>
  const vscode = acquireVsCodeApi();
  function sendMsg(cmd) { vscode.postMessage({ command: cmd }); }
</script>
</body>
</html>`;
}

function handlePanelMessage(msg) {
  if (msg.command === 'toggleCaveman') {
    cavemanActive = !cavemanActive;
    const cmd = cavemanActive ? '/caveman' : 'stop caveman';
    vscode.env.clipboard.writeText(cmd).then(() => {
      vscode.window.showInformationMessage(
        cavemanActive
          ? '🪨 /caveman copiado — pégalo en Claude Code'
          : 'stop caveman copiado — pégalo en Claude Code'
      );
    });
    if (detailPanel) detailPanel.webview.html = buildPanelHtml();
  } else if (msg.command === 'installCaveman') {
    const terminal = vscode.window.createTerminal({ name: 'Instalar Caveman', shellPath: 'powershell.exe' });
    terminal.show();
    terminal.sendText(`New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\\.claude\\skills\\caveman"`);
    terminal.sendText(`Invoke-WebRequest -Uri "https://raw.githubusercontent.com/JuliusBrussee/caveman/main/caveman/SKILL.md" -Headers @{"Accept"="text/plain"} -OutFile "$env:USERPROFILE\\.claude\\skills\\caveman\\SKILL.md"`);
    setTimeout(() => {
      if (detailPanel) detailPanel.webview.html = buildPanelHtml();
    }, 4000);
  }
}

function showDetail() {
  if (detailPanel) {
    detailPanel.reveal(vscode.ViewColumn.Beside);
    detailPanel.webview.html = buildPanelHtml();
    return;
  }

  detailPanel = vscode.window.createWebviewPanel(
    'claudeTokenDetail', 'Monitor de Sesión Claude', vscode.ViewColumn.Beside,
    { enableScripts: true }
  );
  detailPanel.webview.html = buildPanelHtml();
  detailPanel.webview.onDidReceiveMessage(handlePanelMessage);
  detailPanel.onDidDispose(() => { detailPanel = null; });
}

function watchCurrentProject() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) return;

  const cwd = workspaceFolders[0].uri.fsPath;
  const jsonlFile = findActiveSessionFile(cwd);

  if (jsonlFile && jsonlFile !== sessionData.sessionFile) {
    // Nueva sesión detectada
    sessionData.sessionFile = jsonlFile;
    sessionData.processedLines = new Set();
    parseTokensFromJsonl(jsonlFile);

    // Watch del archivo
    fileWatchers.forEach(w => w.close());
    fileWatchers.clear();

    const watcher = fs.watch(jsonlFile, () => {
      parseTokensFromJsonl(jsonlFile);
    });
    fileWatchers.set(jsonlFile, watcher);
  } else if (jsonlFile) {
    parseTokensFromJsonl(jsonlFile);
  }

  // Watch de la carpeta de sesiones para detectar nuevas sesiones
  const sessionsDir = getClaudeSessionsPath();
  if (fs.existsSync(sessionsDir) && !fileWatchers.has('sessions')) {
    const sw = fs.watch(sessionsDir, () => {
      setTimeout(() => watchCurrentProject(), 1000);
    });
    fileWatchers.set('sessions', sw);
  }
}

function activate(context) {
  // Statusbar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'claudeTokenTracker.showDetail';
  statusBarItem.text = '$(sparkle) Uso de sesión';
  statusBarItem.tooltip = 'Monitor Claude — Esperando actividad...';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Comandos
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeTokenTracker.reset', resetSession),
    vscode.commands.registerCommand('claudeTokenTracker.showDetail', showDetail)
  );

  // Iniciar watch
  watchCurrentProject();

  // Re-scan cada 5 segundos por si cambia la sesión activa
  const interval = setInterval(() => watchCurrentProject(), 5000);
  context.subscriptions.push({ dispose: () => clearInterval(interval) });

  // Limpiar watchers al desactivar
  context.subscriptions.push({
    dispose: () => { fileWatchers.forEach(w => w.close()); fileWatchers.clear(); }
  });
}

function deactivate() {
  fileWatchers.forEach(w => w.close());
  fileWatchers.clear();
}

module.exports = { activate, deactivate };
