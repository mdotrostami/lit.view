import { createMockData } from './shared/mockData.js';

const CONTEXT_MENU_ID = 'lit-view.preview';
const COMMAND_ID = 'preview-lit-component';
const PANEL_PATH = 'panel/index.html';
const MESSAGE_TYPES = {
  PREVIEW_REQUESTED: 'lit-view:preview-requested',
  LATEST_PREVIEW: 'lit-view:get-latest-request',
  REQUEST_SELECTION_CONTEXT: 'lit-view:request-selection-context',
  SELECTION_UPDATED: 'lit-view:selection-updated',
  GET_MOCK_DATA: 'lit-view:get-mock-data',
  SAVE_MOCK_DATA: 'lit-view:save-mock-data',
  DOC_HINT: 'lit-view:doc-hint',
  GET_RECENTS: 'lit-view:get-recents',
  GET_PREFS: 'lit-view:get-panel-prefs',
  SAVE_PREFS: 'lit-view:save-panel-prefs',
  GET_MOCK_PRESETS: 'lit-view:get-mock-presets',
  SAVE_MOCK_PRESET: 'lit-view:save-mock-preset'
};

const STORAGE_KEYS = {
  RECENTS: 'litView.recents',
  PREFS: 'litView.panelPrefs',
  PRESETS: 'litView.mockPresets'
};

let latestPreviewRequest = null;
const latestTabSelections = new Map();
let context7Config = null;
initializeContext7Config();

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.contextMenus.remove(CONTEXT_MENU_ID);
  } catch {
    // Nothing to remove on a fresh install.
  }

  await chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Preview Lit Component',
    contexts: ['page', 'selection', 'frame']
  });
});

function initializeContext7Config() {
  chrome.storage.local
    .get('context7Config')
    .then((stored) => {
      context7Config = stored?.context7Config ?? null;
    })
    .catch(() => {
      context7Config = null;
    });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && Object.prototype.hasOwnProperty.call(changes, 'context7Config')) {
      context7Config = changes.context7Config?.newValue ?? null;
    }
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) {
    return;
  }

  await openPreviewPanel({
    tabId: tab?.id,
    selectionText: info.selectionText,
    linkUrl: info.linkUrl,
    frameUrl: info.frameUrl,
    pageUrl: info.pageUrl,
    trigger: 'context-menu'
  });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== COMMAND_ID) {
    return;
  }

  await openPreviewPanel({
    trigger: 'command'
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message?.type) {
    case MESSAGE_TYPES.LATEST_PREVIEW:
      sendResponse({ payload: latestPreviewRequest });
      break;
    case MESSAGE_TYPES.SELECTION_UPDATED: {
      const tabId = sender?.tab?.id;
      if (typeof tabId === 'number') {
        latestTabSelections.set(tabId, {
          ...message.payload,
          tabId
        });
      }
      break;
    }
    case MESSAGE_TYPES.DOC_HINT:
      context7Config = message.payload || null;
      break;
    case MESSAGE_TYPES.GET_MOCK_DATA: {
      handleMockDataRequest(message.payload)
        .then((data) => sendResponse({ payload: data }))
        .catch((error) => {
          console.error('Lit View: failed to read mock data', error);
          sendResponse({ error: error.message });
        });
      return true;
    }
    case MESSAGE_TYPES.SAVE_MOCK_DATA: {
      persistMockData(message.payload)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          console.error('Lit View: failed to save mock data', error);
          sendResponse({ error: error.message });
        });
      return true;
    }
    case MESSAGE_TYPES.GET_RECENTS: {
      getRecents()
        .then((recents) => sendResponse({ payload: recents }))
        .catch((error) => {
          console.error('Lit View: failed to load recents', error);
          sendResponse({ error: error.message });
        });
      return true;
    }
    case MESSAGE_TYPES.GET_PREFS: {
      getPanelPrefs()
        .then((prefs) => sendResponse({ payload: prefs }))
        .catch((error) => {
          console.error('Lit View: failed to load prefs', error);
          sendResponse({ error: error.message });
        });
      return true;
    }
    case MESSAGE_TYPES.SAVE_PREFS: {
      savePanelPrefs(message.payload)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          console.error('Lit View: failed to save prefs', error);
          sendResponse({ error: error.message });
        });
      return true;
    }
    case MESSAGE_TYPES.GET_MOCK_PRESETS: {
      getMockPresets(message.payload?.componentId)
        .then((presets) => sendResponse({ payload: presets }))
        .catch((error) => {
          console.error('Lit View: failed to load mock presets', error);
          sendResponse({ error: error.message });
        });
      return true;
    }
    case MESSAGE_TYPES.SAVE_MOCK_PRESET: {
      saveMockPreset(message.payload)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          console.error('Lit View: failed to save mock preset', error);
          sendResponse({ error: error.message });
        });
      return true;
    }
    default:
      break;
  }
});

async function openPreviewPanel(triggerPayload) {
  const tabId = await resolveTabId(triggerPayload?.tabId);
  if (!tabId) {
    console.warn('Lit View: Unable to determine an active tab for preview.');
    return;
  }

  const selectionContext = await fetchSelectionContext(tabId, triggerPayload?.selectionText);
  latestPreviewRequest = createPreviewRequest(triggerPayload, tabId, selectionContext);
  await recordRecentComponent(latestPreviewRequest);

  await ensureSidePanel(tabId);
  await notifyPanel(latestPreviewRequest);
}

async function resolveTabId(explicitTabId) {
  if (typeof explicitTabId === 'number') {
    return explicitTabId;
  }

  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return activeTab?.id ?? null;
}

async function ensureSidePanel(tabId) {
  await chrome.sidePanel.setOptions({
    tabId,
    path: PANEL_PATH,
    enabled: true
  });

  await chrome.sidePanel.open({ tabId });
}

function createPreviewRequest(triggerPayload, tabId, selectionContext) {
  const timestamp = new Date().toISOString();
  const selectionText = triggerPayload?.selectionText || selectionContext?.selectionText || '';
  const locationFallback = selectionContext?.location?.href ?? selectionContext?.location?.pathname ?? '';
  const dependencies = deriveDependencies(selectionContext);
  const preview = buildPreviewManifest(selectionContext, dependencies, selectionText);
  const componentId = createComponentId(dependencies);
  const mock = createMockData(selectionContext?.selectionText, dependencies);
  const targetId = `${timestamp}:${Math.random().toString(36).slice(2, 7)}`;

  return {
    tabId,
    trigger: triggerPayload?.trigger ?? 'unknown',
    selectionText,
    linkUrl: triggerPayload?.linkUrl ?? '',
    frameUrl: triggerPayload?.frameUrl ?? '',
    pageUrl: triggerPayload?.pageUrl ?? locationFallback,
    selectionContext,
    dependencies,
    preview,
    mock,
    componentId,
    targetId,
    timestamp
  };
}

async function fetchSelectionContext(tabId, fallbackText = '') {
  if (!tabId) {
    return createEmptySelectionContext(fallbackText);
  }

  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: MESSAGE_TYPES.REQUEST_SELECTION_CONTEXT
    });
    if (response?.payload) {
      return response.payload;
    }
  } catch (error) {
    if (!error?.message?.includes('Could not establish connection')) {
      console.warn('Lit View: Unable to read selection context from tab', error);
    }
  }

  if (latestTabSelections.has(tabId)) {
    return latestTabSelections.get(tabId);
  }

  return createEmptySelectionContext(fallbackText);
}

function createEmptySelectionContext(selectionText = '') {
  return {
    selectionText,
    fileHints: [],
    contextElement: null,
    location: null,
    updatedAt: null
  };
}

async function notifyPanel(payload) {
  try {
    const docs = await fetchContextDocs(payload.selectionText, payload.dependencies);
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.PREVIEW_REQUESTED,
      payload: {
        ...payload,
        docs
      }
    });
  } catch (error) {
    // The panel might not be ready yet; keep the payload so it can fetch later.
    if (!error?.message?.includes('Receiving end does not exist')) {
      console.error('Lit View: failed to notify panel', error);
    }
  }
}

function deriveDependencies(selectionContext) {
  const hints = selectionContext?.fileHints ?? [];
  const dependencies = new Set();

  hints.forEach((hint) => dependencies.add(hint));

  const path = selectionContext?.location?.pathname;
  if (path) {
    dependencies.add(path);
  }

  return Array.from(dependencies).slice(0, 10);
}

function createComponentId(dependencies = []) {
  if (dependencies.length) {
    return dependencies[dependencies.length - 1];
  }

  return `anonymous-${Date.now()}`;
}

function buildPreviewManifest(selectionContext, dependencies, selectionText) {
  const componentLabel = inferComponentLabel(dependencies, selectionText);
  const snippet = (selectionContext?.selectionText || selectionText || '').trim();
  const previewText =
    snippet ||
    'Select a Lit component or right-click a file path to render its bundled preview inside Lit View.';

  const html = createPreviewHtml(componentLabel, previewText);

  return {
    componentLabel,
    snippet: previewText,
    html
  };
}

function inferComponentLabel(dependencies, fallbackText) {
  if (dependencies?.length) {
    const last = dependencies[dependencies.length - 1];
    const parts = last.split(/[\\/]/).filter(Boolean);
    const tail = parts[parts.length - 1];
    return tail?.replace(/\.[a-zA-Z0-9]+$/, '') || tail || 'Unknown component';
  }

  if (fallbackText) {
    const tagMatch = fallbackText.match(/<([a-z0-9-]+)>/i);
    if (tagMatch) {
      return tagMatch[1];
    }
  }

  return 'Unknown component';
}

function createPreviewHtml(componentLabel, snippet) {
  const safeSnippet = escapeHtml(snippet);
  const safeLabel = escapeHtml(componentLabel);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light dark;
      }
      body {
        margin: 0;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: #020617;
        color: #e2e8f0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .preview-card {
        border: 1px solid rgba(148, 163, 184, 0.4);
        border-radius: 16px;
        padding: 24px;
        max-width: 360px;
        text-align: center;
        box-shadow: 0 12px 45px rgba(2, 6, 23, 0.6);
        background: radial-gradient(circle at top, rgba(34, 211, 238, 0.15), rgba(2, 6, 23, 0.9));
      }
      h1 {
        margin: 0 0 12px;
        font-size: 20px;
      }
      p {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <div class="preview-card">
      <h1>${safeLabel}</h1>
      <p>${safeSnippet}</p>
    </div>
  </body>
</html>`;
}

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function handleMockDataRequest(payload = {}) {
  const { componentId, scope = 'global' } = payload;
  if (!componentId) {
    return null;
  }

  const keys = [`mock:${scope}:${componentId}`];
  const stored = await chrome.storage.local.get(keys);
  return stored?.[keys[0]] ?? null;
}

async function persistMockData(payload = {}) {
  const { componentId, data, scope = 'global' } = payload;
  if (!componentId || typeof data === 'undefined') {
    throw new Error('Invalid mock payload.');
  }

  const key = `mock:${scope}:${componentId}`;
  await chrome.storage.local.set({
    [key]: data
  });
}

async function fetchContextDocs(selectionText, dependencies) {
  if (!context7Config?.endpoint) {
    return null;
  }

  const query =
    selectionText ||
    dependencies[dependencies.length - 1] ||
    'Lit component preview';

  try {
    const response = await fetch(context7Config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-context7-key': context7Config.apiKey ?? ''
      },
      body: JSON.stringify({
        topic: query,
        limit: context7Config.limit ?? 3
      })
    });

    if (!response.ok) {
      console.warn('Lit View: Context7 request failed', await response.text());
      return null;
    }

    const payload = await response.json();
    return payload?.results ?? null;
  } catch (error) {
    console.warn('Lit View: unable to fetch docs from Context7', error);
    return null;
  }
}

async function getRecents() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.RECENTS);
  return stored?.[STORAGE_KEYS.RECENTS] ?? [];
}

async function recordRecentComponent(request) {
  if (!request?.componentId) {
    return;
  }

  const recents = await getRecents();
  const filtered = recents.filter((item) => item.componentId !== request.componentId);
  filtered.unshift({
    componentId: request.componentId,
    label: request.preview?.componentLabel ?? request.componentId,
    timestamp: request.timestamp
  });

  const next = filtered.slice(0, 10);
  await chrome.storage.local.set({
    [STORAGE_KEYS.RECENTS]: next
  });
}

async function getPanelPrefs() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.PREFS);
  const defaults = { autoReload: true };
  return {
    ...defaults,
    ...(stored?.[STORAGE_KEYS.PREFS] ?? {})
  };
}

async function savePanelPrefs(prefs = {}) {
  const current = await getPanelPrefs();
  const next = { ...current, ...prefs };
  await chrome.storage.local.set({
    [STORAGE_KEYS.PREFS]: next
  });
  return next;
}

async function getMockPresets(componentId) {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.PRESETS);
  const allPresets = stored?.[STORAGE_KEYS.PRESETS] ?? {};
  if (!componentId) {
    return allPresets;
  }

  return allPresets[componentId] ?? {};
}

async function saveMockPreset(payload = {}) {
  const { componentId, name, data } = payload ?? {};
  if (!componentId || !name || typeof data !== 'string') {
    throw new Error('Invalid mock preset payload.');
  }

  let parsed = {};
  try {
    parsed = JSON.parse(data);
  } catch (error) {
    throw new Error('Preset data must be valid JSON.');
  }

  const stored = await chrome.storage.local.get(STORAGE_KEYS.PRESETS);
  const allPresets = stored?.[STORAGE_KEYS.PRESETS] ?? {};
  const componentPresets = allPresets[componentId] ?? {};
  componentPresets[name] = parsed;
  allPresets[componentId] = componentPresets;

  await chrome.storage.local.set({
    [STORAGE_KEYS.PRESETS]: allPresets
  });

  return componentPresets;
}
