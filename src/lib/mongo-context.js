const MAX_DEPTH = 6;
const MAX_ARRAY_LENGTH = 25;

function sanitizeValue(value, depth = 0) {
  if (value == null) {
    return value;
  }

  if (depth >= MAX_DEPTH) {
    return '[MaxDepthReached]';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return `[Buffer:${value.length}]`;
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, nestedValue]) => {
      if (typeof nestedValue !== 'function' && nestedValue !== undefined) {
        acc[key] = sanitizeValue(nestedValue, depth + 1);
      }
      return acc;
    }, {});
  }

  return value;
}

function mergeObjects(baseValue, nextValue) {
  if (baseValue == null) {
    return nextValue;
  }

  if (nextValue == null) {
    return baseValue;
  }

  if (Array.isArray(baseValue) || Array.isArray(nextValue)) {
    return nextValue;
  }

  if (typeof baseValue !== 'object' || typeof nextValue !== 'object') {
    return nextValue;
  }

  const merged = { ...baseValue };
  Object.entries(nextValue).forEach(([key, value]) => {
    merged[key] = key in merged ? mergeObjects(merged[key], value) : value;
  });
  return merged;
}

function createMongoOperationContext(input = {}) {
  const sanitized = sanitizeValue(input);
  return {
    requestId: sanitized.requestId || sanitized?.request?.id || undefined,
    entryPoint: sanitized.entryPoint || 'unknown',
    source: sanitized.source || undefined,
    timestamp: sanitized.timestamp || new Date().toISOString(),
    callSid: sanitized.callSid || sanitized?.twilio?.callSid || sanitized?.payload?.CallSid || undefined,
    streamSid: sanitized.streamSid || sanitized?.twilio?.streamSid || sanitized?.payload?.streamSid || undefined,
    payload: sanitized.payload || undefined,
    request: sanitized.request || undefined,
    twilio: sanitized.twilio || undefined,
    toolCall: sanitized.toolCall || undefined,
    notes: sanitized.notes || undefined,
  };
}

function createOperationSnapshot(context = {}, stage = 'unknown') {
  const normalized = createMongoOperationContext(context);
  return {
    ...normalized,
    stage,
  };
}

function initializeDocumentContext(context = {}, stage = 'unknown') {
  const snapshot = createOperationSnapshot(context, stage);
  return {
    origin: snapshot,
    current: snapshot,
    events: [snapshot],
  };
}

function extendDocumentContext(existingContext, context = {}, stage = 'unknown') {
  const snapshot = createOperationSnapshot(context, stage);
  const previous = existingContext && existingContext.origin
    ? sanitizeValue(existingContext)
    : initializeDocumentContext(context, stage);

  return {
    origin: previous.origin,
    current: mergeObjects(previous.current, snapshot),
    events: [...(previous.events || []), snapshot],
  };
}

module.exports = {
  createMongoOperationContext,
  createOperationSnapshot,
  initializeDocumentContext,
  extendDocumentContext,
};
