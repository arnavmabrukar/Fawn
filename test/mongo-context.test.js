const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createMongoOperationContext,
  initializeDocumentContext,
  extendDocumentContext,
} = require('../src/lib/mongo-context');
const {
  createLeadRecord,
  completeCallRecord,
  listRecentHistory,
} = require('../src/lib/mongo-operations');

test('createMongoOperationContext normalizes request data', () => {
  const context = createMongoOperationContext({
    entryPoint: 'voice.inbound',
    payload: { CallSid: 'CA123' },
    twilio: { streamSid: 'MZ456' },
  });

  assert.equal(context.entryPoint, 'voice.inbound');
  assert.equal(context.callSid, 'CA123');
  assert.equal(context.streamSid, 'MZ456');
  assert.ok(context.timestamp);
});

test('extendDocumentContext preserves origin and appends stage history', () => {
  const initial = initializeDocumentContext({
    entryPoint: 'voice.inbound',
    payload: { CallSid: 'CA123', From: '+15551234567' },
  }, 'call.start');

  const extended = extendDocumentContext(initial, {
    entryPoint: 'voice.websocket.close',
    streamSid: 'MZ456',
    toolCall: { name: 'GenerateDoc' },
  }, 'call.complete');

  assert.equal(extended.origin.entryPoint, 'voice.inbound');
  assert.equal(extended.origin.payload.CallSid, 'CA123');
  assert.equal(extended.current.streamSid, 'MZ456');
  assert.equal(extended.current.toolCall.name, 'GenerateDoc');
  assert.equal(extended.events.length, 2);
  assert.equal(extended.events[1].stage, 'call.complete');
});

test('createLeadRecord stores operationContext on new documents', async () => {
  class FakeLead {
    constructor(doc) {
      Object.assign(this, doc);
      this.$locals = {};
    }

    async save() {
      this.saved = true;
      return this;
    }
  }

  const lead = await createLeadRecord({
    parentName: 'Jane Doe',
    childName: 'Avery',
    age: '4',
    medicalNotes: 'Peanut allergy',
  }, {
    entryPoint: 'voice.tool.generate-doc',
    payload: { CallSid: 'CA123' },
    toolCall: { name: 'GenerateDoc' },
  }, {
    models: { Lead: FakeLead },
  });

  assert.equal(lead.saved, true);
  assert.equal(lead.childAge, 4);
  assert.equal(lead.operationContext.origin.payload.CallSid, 'CA123');
  assert.equal(lead.operationContext.current.toolCall.name, 'GenerateDoc');
  assert.equal(lead.operationContext.events[0].stage, 'lead.create');
});

test('completeCallRecord merges original request data into later updates', async () => {
  const existingCall = {
    startTime: new Date('2026-04-02T12:00:00.000Z'),
    operationContext: initializeDocumentContext({
      entryPoint: 'voice.inbound',
      payload: { CallSid: 'CA123', From: '+15551234567' },
    }, 'call.start'),
    async save() {
      this.saved = true;
      return this;
    },
  };

  class FakeQuery {
    constructor(result) {
      this.result = result;
      this.options = {};
    }

    sort(value) {
      this.sortValue = value;
      return this;
    }

    setOptions(options) {
      this.options = options;
      return this;
    }

    async exec() {
      return this.result;
    }
  }

  const query = new FakeQuery(existingCall);
  const models = {
    Call: {
      findOne(filter) {
        query.filter = filter;
        return query;
      },
    },
  };

  const updated = await completeCallRecord({
    streamSid: 'MZ456',
    endTime: new Date('2026-04-02T12:05:00.000Z'),
  }, {
    entryPoint: 'voice.websocket.close',
    streamSid: 'MZ456',
    twilio: { streamSid: 'MZ456' },
  }, {
    models,
  });

  assert.deepEqual(query.filter, { streamSid: 'MZ456' });
  assert.equal(query.options.operationContext.streamSid, 'MZ456');
  assert.equal(updated.duration, 300);
  assert.equal(updated.saved, true);
  assert.equal(updated.operationContext.origin.payload.CallSid, 'CA123');
  assert.equal(updated.operationContext.current.streamSid, 'MZ456');
  assert.equal(updated.operationContext.events.length, 2);
});

test('listRecentHistory passes the same context to lead and call queries', async () => {
  const queries = [];

  class FakeQuery {
    constructor(result, name) {
      this.result = result;
      this.name = name;
    }

    sort() {
      return this;
    }

    limit() {
      return this;
    }

    setOptions(options) {
      this.options = options;
      queries.push({ name: this.name, options });
      return this;
    }

    async exec() {
      return this.result;
    }
  }

  const models = {
    Lead: {
      find() {
        return new FakeQuery([{ childName: 'Avery' }], 'Lead');
      },
    },
    Call: {
      find() {
        return new FakeQuery([{ streamSid: 'MZ456' }], 'Call');
      },
    },
  };

  const { historicalLeads, historicalCalls } = await listRecentHistory({
    entryPoint: 'history.list',
    requestId: 'req-123',
  }, {
    models,
  });

  assert.equal(historicalLeads.length, 1);
  assert.equal(historicalCalls.length, 1);
  assert.equal(queries.length, 2);
  assert.equal(queries[0].options.operationContext.requestId, 'req-123');
  assert.equal(queries[1].options.operationContext.requestId, 'req-123');
});
