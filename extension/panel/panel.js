const MESSAGE_TYPES = {
  PREVIEW_REQUESTED: 'lit-view:preview-requested',
  LATEST_PREVIEW: 'lit-view:get-latest-request'
};

import { inferSchemaFromText, createMockFromSchema, createSampleMock, isLikelyColor } from '../shared/mockData.js';

const statusLineEl = document.getElementById('status-line');
const detailsEl = document.getElementById('preview-details');
const metaEl = document.getElementById('preview-meta');
const placeholderEl = document.getElementById('preview-placeholder');
const breadcrumbsEl = document.getElementById('breadcrumbs');
const componentTitleEl = document.getElementById('component-title');
const subtitleEl = document.getElementById('preview-subtitle');
const previewFrameEl = document.getElementById('preview-frame');
const hotIndicatorEl = document.getElementById('hot-indicator');
const reloadButton = document.getElementById('reload-button');
const mockJsonEl = document.getElementById('mock-json');
const mockSchemaEl = document.getElementById('mock-schema');
const mockStatusEl = document.getElementById('mock-status');
const resetMockButton = document.getElementById('reset-mock');
const mockFormEl = document.getElementById('mock-form');
const suggestMockButton = document.getElementById('suggest-mock');
const docsListEl = document.getElementById('docs-list');
const recentsListEl = document.getElementById('recents-list');
const prefsAutoReloadEl = document.getElementById('pref-auto-reload');
const presetNameEl = document.getElementById('preset-name');
const savePresetButton = document.getElementById('save-preset');
const presetListEl = document.getElementById('preset-list');
const MOCK_MESSAGE_TYPES = {
  GET: 'lit-view:get-mock-data',
  SAVE: 'lit-view:save-mock-data'
};
const STORAGE_MESSAGE_TYPES = {
  GET_RECENTS: 'lit-view:get-recents',
  GET_PREFS: 'lit-view:get-panel-prefs',
  SAVE_PREFS: 'lit-view:save-panel-prefs',
  GET_PRESETS: 'lit-view:get-mock-presets',
  SAVE_PRESET: 'lit-view:save-mock-preset'
};

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === MESSAGE_TYPES.PREVIEW_REQUESTED) {
    handlePreview(message.payload);
  }
});

init();
let lastPayload = null;
let currentTargetId = null;
let baselineMockSnapshot = null;
let currentMockScope = 'global';
let panelPrefs = { autoReload: true };
let currentComponentId = null;
let currentMockSchema = [];
let currentMockData = {};

reloadButton?.addEventListener('click', () => {
  if (lastPayload) {
    updatePreview(lastPayload, false);
  }
});

mockJsonEl?.addEventListener('input', handleMockInput);
resetMockButton?.addEventListener('click', () => {
  if (!baselineMockSnapshot) {
    mockStatus('No baseline to reset to yet.', 'error');
    return;
  }

  const baseline = safeParseJson(baselineMockSnapshot) ?? {};
  mockStatus('Reverted to inferred mock data.', 'info');
  syncMockEditorsFromData(baseline, { persist: false });
});
prefsAutoReloadEl?.addEventListener('change', handlePrefChange);
savePresetButton?.addEventListener('click', handlePresetSave);
suggestMockButton?.addEventListener('click', injectSampleMockData);

async function init() {
  metaEl.textContent = 'Awaiting preview request…';
  await Promise.all([refreshRecents(), loadPanelPrefs()]);

  try {
    const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.LATEST_PREVIEW });
    if (response?.payload) {
      handlePreview(response.payload);
    }
  } catch (error) {
    console.error('Lit View panel: unable to restore last preview request', error);
  }
}

function handlePreview(payload) {
  if (!payload) {
    statusLineEl.textContent = 'Ready when you are.';
    return;
  }

  const targetId = payload.targetId ?? payload.timestamp;
  const isNewTarget = targetId !== currentTargetId;
  currentTargetId = targetId;
  lastPayload = payload;
  currentComponentId = payload.componentId ?? null;

  hidePlaceholder();
  metaEl.textContent = describeRequest(payload);
  statusLineEl.textContent = payload.selectionText
    ? `Selection: ${payload.selectionText}`
    : 'No explicit selection was provided.';

  const details = [
    ['Trigger', payload.trigger ?? 'unknown'],
    ['Page', payload.pageUrl ?? ''],
    ['Frame', payload.frameUrl ?? ''],
    ['Link', payload.linkUrl ?? '']
  ];

  appendSelectionContext(details, payload.selectionContext);
  renderDetails(details);
  renderBreadcrumbs(payload.dependencies ?? [], payload.preview?.componentLabel);
  if (panelPrefs.autoReload) {
    updatePreview(payload, isNewTarget);
  } else {
    subtitleEl.textContent = 'Auto reload disabled. Click Reload Preview.';
  }
  updateMockEditor(payload.mock ?? {}, payload.componentId);
  renderDocs(payload.docs);
  toggleHotIndicator(isNewTarget);
  refreshRecents();
}

function renderDetails(entries) {
  detailsEl.innerHTML = '';
  const fragment = document.createDocumentFragment();

  entries.forEach(([label, value]) => {
    if (!value) {
      return;
    }

    const dt = document.createElement('dt');
    dt.textContent = label;

    const dd = document.createElement('dd');
    dd.textContent = value;

    fragment.appendChild(dt);
    fragment.appendChild(dd);
  });

  if (!fragment.childNodes.length) {
    const dt = document.createElement('dt');
    dt.textContent = 'Info';
    const dd = document.createElement('dd');
    dd.textContent = 'Waiting for component metadata…';
    fragment.appendChild(dt);
    fragment.appendChild(dd);
  }

  detailsEl.appendChild(fragment);
}

function describeRequest(payload) {
  const timestamp = payload.timestamp ? new Date(payload.timestamp).toLocaleTimeString() : 'unknown time';
  return `Triggered via ${payload.trigger ?? 'unknown'} at ${timestamp}`;
}

function hidePlaceholder() {
  if (placeholderEl) {
    placeholderEl.hidden = true;
  }
}

function renderBreadcrumbs(dependencies, activeLabel) {
  if (!breadcrumbsEl) {
    return;
  }

  breadcrumbsEl.innerHTML = '';

  if (!dependencies?.length) {
    const chip = document.createElement('span');
    chip.className = 'breadcrumb-chip';
    chip.textContent = 'No dependencies yet.';
    breadcrumbsEl.appendChild(chip);
    return;
  }

  dependencies.slice(0, 8).forEach((dep, index) => {
    const chip = document.createElement('span');
    chip.className = 'breadcrumb-chip';
    chip.textContent = dep;

    if (activeLabel && dep.includes(activeLabel)) {
      chip.classList.add('active');
    } else if (!activeLabel && index === dependencies.length - 1) {
      chip.classList.add('active');
    }

    breadcrumbsEl.appendChild(chip);
  });
}

function updatePreview(payload, isNewTarget) {
  const preview = payload.preview;
  if (componentTitleEl) {
    componentTitleEl.textContent = preview?.componentLabel ?? 'Nothing selected';
  }
  if (subtitleEl) {
    subtitleEl.textContent = preview?.snippet
      ? truncate(preview.snippet, 140)
      : 'Waiting for a bundle…';
  }

  if (preview?.html) {
    if (previewFrameEl) {
      previewFrameEl.hidden = false;
      previewFrameEl.srcdoc = preview.html;
    }
    placeholderEl.hidden = true;
    flashFrame(isNewTarget);
  } else {
    if (previewFrameEl) {
      previewFrameEl.hidden = true;
    }
    placeholderEl.hidden = false;
  }
}

function truncate(text, limit) {
  if (!text) {
    return '';
  }
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function flashFrame(isNewTarget) {
  if (!isNewTarget || !previewFrameEl) {
    return;
  }

  previewFrameEl.classList.remove('flash');
  void previewFrameEl.offsetWidth; // force reflow
  previewFrameEl.classList.add('flash');
  setTimeout(() => previewFrameEl.classList.remove('flash'), 600);
}

function toggleHotIndicator(show) {
  if (!hotIndicatorEl) {
    return;
  }

  hotIndicatorEl.hidden = !show;
  if (show) {
    setTimeout(() => {
      hotIndicatorEl.hidden = true;
    }, 2500);
  }
}

function appendSelectionContext(entries, context) {
  if (!context) {
    return;
  }

  if (context.location?.href) {
    entries.push(['Location', context.location.href]);
  }

  if (context.fileHints?.length) {
    entries.push(['File hints', context.fileHints.join(', ')]);
  }

  if (context.contextElement?.tag) {
    const { tag, id, classes } = context.contextElement;
    let descriptor = `<${tag}>`;
    if (id) {
      descriptor += `#${id}`;
    }
    if (classes?.length) {
      descriptor += `.${classes.join('.')}`;
    }

    entries.push(['Context element', descriptor]);
  }
}

async function updateMockEditor(mockPayload, componentId) {
  const schema =
    mockPayload.schema ??
    inferSchemaFromText(lastPayload?.selectionContext?.selectionText ?? '', lastPayload?.dependencies ?? []);
  const storedData = normalizeMockData(await fetchPersistedMock(componentId));
  const payloadData = normalizeMockData(mockPayload.data);
  const initialData = storedData ?? payloadData ?? createMockFromSchema(schema);

  currentMockSchema = Array.isArray(schema) ? schema : [];
  renderMockSchema(currentMockSchema);
  baselineMockSnapshot = JSON.stringify(initialData ?? {}, null, 2);
  mockStatus('Use the JSON editor or the auto-generated form to tweak props live.', 'info');
  syncMockEditorsFromData(initialData ?? {}, { persist: false });
  loadPresets(componentId);
}

function renderMockSchema(schema) {
  if (!mockSchemaEl) {
    return;
  }

  mockSchemaEl.innerHTML = '';
  if (!schema?.length) {
    const item = document.createElement('li');
    item.textContent = 'No props inferred yet.';
    mockSchemaEl.appendChild(item);
    return;
  }

  schema.forEach((entry) => {
    const item = document.createElement('li');
    item.textContent = `${entry.name} (${entry.type})`;
    mockSchemaEl.appendChild(item);
  });
}

function handleMockInput() {
  const value = mockJsonEl.value;
  try {
    const parsed = JSON.parse(value || '{}');
    mockStatus('Applying mock update…', 'info');
    currentMockData = cloneMockData(parsed);
    applyMockData(value);
    persistMockSnapshot(value);
    renderMockForm(currentMockSchema, currentMockData);
    mockStatus('Mock data applied.', 'success');
  } catch (error) {
    mockStatus(`Invalid JSON: ${error.message}`, 'error');
  }
}

function applyMockData(jsonText) {
  if (!previewFrameEl || !jsonText) {
    return;
  }

  previewFrameEl.contentWindow?.postMessage(
    {
      type: 'lit-view:mock-update',
      payload: jsonText
    },
    '*'
  );
}

function mockStatus(message, variant = 'info') {
  if (!mockStatusEl) {
    return;
  }

  mockStatusEl.textContent = message;
  mockStatusEl.dataset.variant = variant;
}

function renderDocs(docs) {
  if (!docsListEl) {
    return;
  }

  docsListEl.innerHTML = '';
  if (!docs?.length) {
    docsListEl.innerHTML = '<li>No docs available for this component.</li>';
    return;
  }

  docs.forEach((doc) => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = doc.url || '#';
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = doc.title ?? doc.url ?? 'Reference';
    item.appendChild(link);
    if (doc.snippet) {
      const snippet = document.createElement('p');
      snippet.textContent = doc.snippet;
      item.appendChild(snippet);
    }
    docsListEl.appendChild(item);
  });
}

async function fetchPersistedMock(componentId) {
  if (!componentId) {
    return null;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: MOCK_MESSAGE_TYPES.GET,
      payload: {
        componentId,
        scope: currentMockScope
      }
    });

    return response?.payload ?? null;
  } catch (error) {
    console.warn('Lit View panel: unable to load persisted mock', error);
    return null;
  }
}

function persistMockSnapshot(value) {
  if (!lastPayload?.componentId) {
    return;
  }

  const payloadValue = normalizeMockData(value) ?? value;
  chrome.runtime.sendMessage({
    type: MOCK_MESSAGE_TYPES.SAVE,
    payload: {
      componentId: lastPayload.componentId,
      scope: currentMockScope,
      data: payloadValue
    }
  });
}

function renderMockForm(schema = [], data = {}) {
  if (!mockFormEl) {
    return;
  }

  mockFormEl.innerHTML = '';
  if (!schema.length) {
    const empty = document.createElement('p');
    empty.className = 'mock-form__empty';
    empty.textContent = 'No props inferred yet. Start typing in the JSON editor to add custom data.';
    mockFormEl.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  schema.forEach((field, index) => {
    fragment.appendChild(createMockField(field, data?.[field.name], index));
  });
  mockFormEl.appendChild(fragment);
}

function createMockField(field, value, index) {
  const wrapper = document.createElement('label');
  wrapper.className = 'mock-field';
  wrapper.dataset.fieldType = field?.type ?? 'string';

  const head = document.createElement('div');
  head.className = 'mock-field__head';
  const title = document.createElement('span');
  title.className = 'mock-field__name';
  title.textContent = field?.name ?? `Prop ${index + 1}`;
  const badge = document.createElement('span');
  badge.className = 'mock-field__chip';
  badge.textContent = field?.type ?? 'string';
  head.appendChild(title);
  head.appendChild(badge);

  const control = createControlForField(field, value);
  wrapper.appendChild(head);
  wrapper.appendChild(control);

  if (typeof field?.defaultValue !== 'undefined' && field.defaultValue !== null && field.defaultValue !== '') {
    const hint = document.createElement('p');
    hint.className = 'mock-field__hint';
    const defaultText =
      typeof field.defaultValue === 'object'
        ? JSON.stringify(field.defaultValue)
        : String(field.defaultValue);
    hint.textContent = `Default: ${defaultText}`;
    wrapper.appendChild(hint);
  }

  return wrapper;
}

function createControlForField(field, value) {
  const controlType = detectControlType(field, value);
  const eventType = controlType === 'checkbox' || controlType === 'json' ? 'change' : 'input';

  if (controlType === 'textarea' || controlType === 'json') {
    const textarea = document.createElement('textarea');
    textarea.className = 'mock-field__input';
    textarea.rows = controlType === 'json' ? 4 : 3;
    textarea.value =
      controlType === 'json'
        ? JSON.stringify(value ?? {}, null, 2)
        : typeof value === 'string'
        ? value
        : '';
    textarea.dataset.fieldName = field?.name ?? '';
    textarea.dataset.fieldType = field?.type ?? 'string';
    textarea.dataset.controlType = controlType;
    textarea.spellcheck = controlType !== 'json';
    textarea.addEventListener(eventType, handleMockFieldEvent);
    return textarea;
  }

  const input = document.createElement('input');
  input.className = 'mock-field__input';
  input.dataset.fieldName = field?.name ?? '';
  input.dataset.fieldType = field?.type ?? 'string';
  input.dataset.controlType = controlType;

  switch (controlType) {
    case 'checkbox':
      input.type = 'checkbox';
      input.checked = value !== false;
      break;
    case 'number':
      input.type = 'number';
      input.value = typeof value === 'number' ? String(value) : '';
      input.placeholder = '0';
      input.step = 'any';
      break;
    case 'color':
      input.type = 'color';
      input.value = ensureColorValue(value);
      break;
    case 'email':
    case 'url':
      input.type = controlType;
      input.value = typeof value === 'string' ? value : '';
      input.placeholder = controlType === 'email' ? 'user@example.com' : 'https://lit.dev';
      break;
    default:
      input.type = 'text';
      input.value = typeof value === 'undefined' || value === null ? '' : String(value);
      break;
  }

  input.addEventListener(eventType, handleMockFieldEvent);
  return input;
}

function detectControlType(field, value) {
  if (!field) {
    return 'text';
  }

  if (field.type === 'boolean') {
    return 'checkbox';
  }

  if (field.type === 'number') {
    return 'number';
  }

  if (field.type === 'object' || typeof value === 'object') {
    return 'json';
  }

  const name = (field.name ?? '').toLowerCase();
  const stringValue = typeof value === 'string' ? value : '';

  if (name.includes('color') || isLikelyColor(stringValue)) {
    return 'color';
  }

  if (name.includes('email')) {
    return 'email';
  }

  if (name.includes('url') || name.includes('href') || name.includes('link')) {
    return 'url';
  }

  if (
    name.includes('message') ||
    name.includes('description') ||
    name.includes('details') ||
    looksLikeParagraph(stringValue)
  ) {
    return 'textarea';
  }

  return 'text';
}

function handleMockFieldEvent(event) {
  const target = event.target;
  if (!target?.dataset?.fieldName) {
    return;
  }

  const fieldName = target.dataset.fieldName;
  const fieldType = target.dataset.fieldType ?? 'string';
  const controlType = target.dataset.controlType ?? target.type ?? 'text';

  try {
    const nextValue = readFieldValue(controlType, fieldType, target);
    currentMockData = {
      ...currentMockData,
      [fieldName]: nextValue
    };
    const snapshot = JSON.stringify(currentMockData ?? {}, null, 2);
    if (mockJsonEl) {
      mockJsonEl.value = snapshot;
    }
    applyMockData(snapshot);
    persistMockSnapshot(snapshot);
    mockStatus('Mock data applied.', 'success');
  } catch (error) {
    mockStatus(error.message ?? 'Unable to update field.', 'error');
  }
}

function readFieldValue(controlType, fieldType, target) {
  if (controlType === 'checkbox') {
    return target.checked;
  }

  if (controlType === 'number') {
    return target.value === '' ? 0 : Number(target.value);
  }

  if (controlType === 'color' || controlType === 'text' || controlType === 'email' || controlType === 'url') {
    return target.value;
  }

  if (controlType === 'textarea') {
    return target.value;
  }

  if (controlType === 'json' || fieldType === 'object') {
    if (!target.value.trim()) {
      return {};
    }
    try {
      return JSON.parse(target.value);
    } catch (error) {
      throw new Error(`Invalid JSON for ${target.dataset.fieldName}`);
    }
  }

  return target.value;
}

function injectSampleMockData() {
  if (!currentMockSchema.length) {
    mockStatus('Trigger a preview first so we can infer props to populate.', 'error');
    return;
  }

  const sample = createSampleMock(currentMockSchema);
  mockStatus('Inserted dummy data from the inferred schema.', 'success');
  syncMockEditorsFromData(sample, { persist: false });
}

function syncMockEditorsFromData(data = {}, options = {}) {
  const snapshotData = cloneMockData(data);
  currentMockData = snapshotData;
  const snapshot = JSON.stringify(snapshotData ?? {}, null, 2);
  if (mockJsonEl) {
    mockJsonEl.value = snapshot;
  }
  applyMockData(snapshot);
  if (options.persist) {
    persistMockSnapshot(snapshot);
  }
  renderMockForm(currentMockSchema, currentMockData);
}

function cloneMockData(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value ?? {});
  }

  try {
    return JSON.parse(JSON.stringify(value ?? {}));
  } catch {
    return {};
  }
}

function safeParseJson(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeMockData(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return safeParseJson(value);
  }

  if (typeof value === 'object') {
    return value;
  }

  return null;
}

function looksLikeParagraph(value = '') {
  return typeof value === 'string' && (value.length > 80 || value.includes('\n'));
}

function ensureColorValue(value) {
  if (isLikelyColor(value)) {
    return value;
  }

  return '#22d3ee';
}
async function refreshRecents() {
  try {
    const response = await chrome.runtime.sendMessage({ type: STORAGE_MESSAGE_TYPES.GET_RECENTS });
    renderRecents(response?.payload ?? []);
  } catch (error) {
    console.warn('Lit View panel: unable to load recents', error);
  }
}

function renderRecents(recents) {
  if (!recentsListEl) {
    return;
  }

  recentsListEl.innerHTML = '';
  if (!recents.length) {
    recentsListEl.innerHTML = '<li>No recent components.</li>';
    return;
  }

  recents.forEach((entry) => {
    const li = document.createElement('li');
    li.textContent = entry.label ?? entry.componentId;
    const timestamp = document.createElement('span');
    timestamp.textContent = new Date(entry.timestamp).toLocaleTimeString();
    li.appendChild(timestamp);
    recentsListEl.appendChild(li);
  });
}

async function loadPanelPrefs() {
  try {
    const response = await chrome.runtime.sendMessage({ type: STORAGE_MESSAGE_TYPES.GET_PREFS });
    panelPrefs = response?.payload ?? { autoReload: true };
    if (prefsAutoReloadEl) {
      prefsAutoReloadEl.checked = panelPrefs.autoReload;
    }
  } catch (error) {
    console.warn('Lit View panel: unable to load prefs', error);
  }
}

function handlePrefChange(event) {
  panelPrefs.autoReload = Boolean(event.target.checked);
  chrome.runtime.sendMessage({
    type: STORAGE_MESSAGE_TYPES.SAVE_PREFS,
    payload: panelPrefs
  });
}

async function loadPresets(componentId) {
  if (!presetListEl) {
    return;
  }

  if (!componentId) {
    presetListEl.innerHTML = '<li>No presets yet.</li>';
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: STORAGE_MESSAGE_TYPES.GET_PRESETS,
      payload: { componentId }
    });
    renderPresetList(response?.payload ?? {});
  } catch (error) {
    console.warn('Lit View panel: unable to load presets', error);
  }
}

function renderPresetList(presets) {
  if (!presetListEl) {
    return;
  }

  const names = Object.keys(presets);
  presetListEl.innerHTML = '';
  if (!names.length) {
    presetListEl.innerHTML = '<li>No presets yet.</li>';
    return;
  }

  names.forEach((name) => {
    const li = document.createElement('li');
    li.textContent = name;
    li.dataset.presetName = name;
    li.addEventListener('click', () => {
      mockStatus(`Loaded preset "${name}".`, 'info');
      syncMockEditorsFromData(presets[name] ?? {}, { persist: false });
    });
    presetListEl.appendChild(li);
  });
}

async function handlePresetSave() {
  if (!currentComponentId || !presetNameEl) {
    return;
  }

  const name = presetNameEl.value.trim();
  if (!name) {
    mockStatus('Enter a preset name before saving.', 'error');
    return;
  }

  const value = mockJsonEl?.value ?? '{}';
  try {
    JSON.parse(value || '{}');
  } catch (error) {
    mockStatus(`Invalid JSON: ${error.message}`, 'error');
    return;
  }

  try {
    await chrome.runtime.sendMessage({
      type: STORAGE_MESSAGE_TYPES.SAVE_PRESET,
      payload: {
        componentId: currentComponentId,
        name,
        data: value
      }
    });
    mockStatus(`Preset "${name}" saved.`, 'success');
    presetNameEl.value = '';
    loadPresets(currentComponentId);
  } catch (error) {
    mockStatus('Unable to save preset.', 'error');
    console.warn('Lit View panel: failed to save preset', error);
  }
}
