(function () {
  const MESSAGE_TYPES = {
    REQUEST_SELECTION_CONTEXT: 'lit-view:request-selection-context',
    SELECTION_UPDATED: 'lit-view:selection-updated'
  };

  const FILE_ATTRS = [
    'data-file',
    'data-filepath',
    'data-path',
    'data-src',
    'data-module',
    'data-component',
    'data-entry'
  ];

  const MAX_SELECTION_LENGTH = 2000;
  let latestPayload = null;
  let lastBroadcastKey = '';

  document.addEventListener('selectionchange', handleSelectionChange, { passive: true });
  window.addEventListener('pointerup', handleSelectionChange, { passive: true });
  window.addEventListener('keyup', handleSelectionChange, { passive: true });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === MESSAGE_TYPES.REQUEST_SELECTION_CONTEXT) {
      sendResponse({ payload: latestPayload ?? buildSelectionPayload() });
    }
  });

  refreshSelectionSnapshot();

  function handleSelectionChange() {
    refreshSelectionSnapshot(true);
  }

  function refreshSelectionSnapshot(shouldBroadcast = false) {
    latestPayload = buildSelectionPayload();
    if (!shouldBroadcast) {
      return;
    }

    const broadcastKey = JSON.stringify([
      latestPayload.selectionText,
      latestPayload.fileHints?.join('|') ?? '',
      latestPayload.contextElement?.tag ?? '',
      latestPayload.location?.pathname ?? ''
    ]);

    if (broadcastKey === lastBroadcastKey) {
      return;
    }

    lastBroadcastKey = broadcastKey;
    broadcastSelection(latestPayload);
  }

  function buildSelectionPayload() {
    const selectionText = sanitizeSelectionText(getSelectionText());
    const anchorElement = resolveAnchorElement();

    return {
      selectionText,
      contextElement: describeElement(anchorElement),
      fileHints: collectFileHints(anchorElement),
      location: getLocationMetadata(),
      updatedAt: new Date().toISOString()
    };
  }

  function sanitizeSelectionText(value) {
    if (!value) {
      return '';
    }

    const trimmed = value.trim().replace(/\s+/g, ' ');
    return trimmed.slice(0, MAX_SELECTION_LENGTH);
  }

  function getSelectionText() {
    const selection = window.getSelection();
    if (!selection) {
      return '';
    }

    return selection.toString();
  }

  function resolveAnchorElement() {
    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode;

    if (anchorNode && anchorNode.nodeType === Node.ELEMENT_NODE) {
      return anchorNode;
    }

    if (anchorNode?.parentElement) {
      return anchorNode.parentElement;
    }

    return document.activeElement ?? document.body;
  }

  function describeElement(element) {
    if (!element) {
      return null;
    }

    const classes = Array.from(element.classList || []).slice(0, 5);
    const tag = element.tagName?.toLowerCase() ?? 'unknown';

    return {
      tag,
      classes,
      id: element.id || null,
      data: extractDataAttributes(element)
    };
  }

  function extractDataAttributes(element) {
    if (!element?.dataset) {
      return {};
    }

    const entries = Object.entries(element.dataset).slice(0, 10);
    return Object.fromEntries(entries);
  }

  function collectFileHints(element) {
    const hints = new Set();
    const metaHints = document.querySelectorAll('meta[name^="lit-view:" i]');

    metaHints.forEach((meta) => {
      const name = meta.getAttribute('name') || '';
      if (!name.toLowerCase().includes('path')) {
        return;
      }

      const value = meta.getAttribute('content');
      if (value) {
        hints.add(value);
      }
    });

    let current = element;
    let depth = 0;

    while (current && depth < 10) {
      FILE_ATTRS.forEach((attr) => {
        const candidate = current.getAttribute?.(attr);
        if (candidate) {
          hints.add(candidate);
        }
      });

      if (current.tagName === 'A') {
        const href = current.getAttribute('href');
        if (href && looksLikeFile(href)) {
          hints.add(href);
        }
      }

      current = current.parentElement;
      depth += 1;
    }

    const locationPath = window.location.pathname;
    if (looksLikeFile(locationPath)) {
      hints.add(locationPath);
    }

    return Array.from(hints);
  }

  function looksLikeFile(path) {
    if (!path) {
      return false;
    }

    return /\.[cm]?tsx?$|\.[cm]?jsx?$/.test(path);
  }

  function getLocationMetadata() {
    return {
      href: window.location.href,
      origin: window.location.origin,
      pathname: window.location.pathname,
      title: document.title
    };
  }

  function broadcastSelection(payload) {
    try {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.SELECTION_UPDATED,
        payload
      });
    } catch (error) {
      console.debug('Lit View content script: unable to broadcast selection change', error);
    }
  }
})();
