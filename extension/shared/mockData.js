export function inferTypeFromLiteral(value = '') {
  if (value === 'true' || value === 'false') {
    return 'boolean';
  }

  if (!Number.isNaN(Number(value))) {
    return 'number';
  }

  if (value.startsWith('{') || value.startsWith('[')) {
    return 'object';
  }

  return 'string';
}

export function createDefaultValue(value = '') {
  const type = inferTypeFromLiteral(value);

  switch (type) {
    case 'boolean':
      return value === 'true';
    case 'number':
      return Number(value);
    case 'object':
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    default:
      return value;
  }
}

export function inferSchemaFromText(selectionText = '', dependencies = []) {
  const matches = Array.from(selectionText.matchAll(/([a-zA-Z0-9-_]+)=["']([^"']+)["']/g));

  const schema = matches.slice(0, 6).map((match) => ({
    name: match[1],
    type: inferTypeFromLiteral(match[2]),
    defaultValue: createDefaultValue(match[2])
  }));

  if (schema.length === 0 && dependencies.length) {
    schema.push({
      name: 'component',
      type: 'string',
      defaultValue: dependencies[dependencies.length - 1]
    });
  }

  return schema;
}

export function createMockData(selectionText = '', dependencies = []) {
  const schema = inferSchemaFromText(selectionText, dependencies);
  const data = schema.reduce((acc, entry) => {
    acc[entry.name] = entry.defaultValue;
    return acc;
  }, {});

  return { schema, data };
}

export function createMockFromSchema(schema = []) {
  const entry = {};

  schema.forEach((field) => {
    switch (field.type) {
      case 'boolean':
        entry[field.name] = true;
        break;
      case 'number':
        entry[field.name] = 0;
        break;
      case 'object':
        entry[field.name] = {};
        break;
      default:
        entry[field.name] = '';
        break;
    }
  });

  return entry;
}

const SAMPLE_LABELS = ['Launch dark mode', 'Ship release candidate', 'Refine panel polish', 'Verify contracts'];
const SAMPLE_PARAGRAPHS = [
  'Keep the preview pinned to see every prop change happen live.',
  'Drop updated mock data in the form to sanity-check multi-state components.',
  'Use presets to toggle between flows without editing source files.'
];
const SAMPLE_NAMES = ['River Chen', 'Nova Ortega', 'Atlas Patel', 'Indigo Vale'];
const SAMPLE_COLORS = ['#22d3ee', '#a855f7', '#f472b6', '#fbbf24', '#34d399'];
const SAMPLE_STATUS = ['active', 'paused', 'needs-review', 'complete'];

export function isLikelyColor(value = '') {
  if (typeof value !== 'string') {
    return false;
  }

  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

export function createSampleMock(schema = []) {
  const sample = {};
  schema.forEach((field, index) => {
    sample[field.name] = createSampleValue(field, index);
  });
  return sample;
}

function createSampleValue(field, index) {
  const type = field?.type ?? 'string';
  const defaultValue = field?.defaultValue;
  switch (type) {
    case 'boolean':
      if (typeof defaultValue === 'boolean') {
        return defaultValue;
      }
      return index % 2 === 0;
    case 'number':
      if (typeof defaultValue === 'number' && !Number.isNaN(defaultValue)) {
        return defaultValue;
      }
      return 1 + index * 3;
    case 'object':
      if (defaultValue && typeof defaultValue === 'object') {
        return defaultValue;
      }
      return { note: SAMPLE_PARAGRAPHS[index % SAMPLE_PARAGRAPHS.length] };
    default:
      return createSampleString(field, index);
  }
}

function createSampleString(field, index) {
  const name = (field?.name ?? '').toLowerCase();
  const defaultValue = typeof field?.defaultValue === 'string' ? field.defaultValue : '';

  if (name.includes('color') || isLikelyColor(defaultValue)) {
    return defaultValue || pick(SAMPLE_COLORS, index);
  }

  if (name.includes('status') || name.includes('state')) {
    return pick(SAMPLE_STATUS, index);
  }

  if (name.includes('name')) {
    return pick(SAMPLE_NAMES, index);
  }

  if (name.includes('email')) {
    return `team+${index + 1}@litview.dev`;
  }

  if (name.includes('message') || name.includes('description') || name.includes('details')) {
    return pick(SAMPLE_PARAGRAPHS, index);
  }

  if (name.includes('url') || name.includes('href') || name.includes('link')) {
    return 'https://lit.dev/examples';
  }

  if (name.includes('role')) {
    return pick(['Designer', 'Engineer', 'Product'], index);
  }

  if (name.includes('title') || name.includes('label') || name.includes('heading')) {
    return pick(SAMPLE_LABELS, index);
  }

  return defaultValue || pick(SAMPLE_LABELS, index + 1);
}

function pick(list, index) {
  if (!Array.isArray(list) || list.length === 0) {
    return '';
  }

  return list[index % list.length];
}
