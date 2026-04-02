/* eslint-disable @typescript-eslint/no-require-imports */
const { Lead, Call, ToyFeedback, RoomRatio } = require('../../db');
const {
  createMongoOperationContext,
  initializeDocumentContext,
  extendDocumentContext,
} = require('./mongo-context');

function getModels(models) {
  return models || { Lead, Call, ToyFeedback, RoomRatio };
}

function observe(observer, payload) {
  if (typeof observer === 'function') {
    observer(payload);
  }
}

function withQueryContext(query, context, observer, modelName, operation) {
  query.setOptions?.({ operationContext: context });
  observe(observer, { modelName, operation, context });
  return query;
}

async function createLeadRecord(input, contextInput = {}, dependencies = {}) {
  const context = createMongoOperationContext(contextInput);
  const { Lead: LeadModel } = getModels(dependencies.models);
  const lead = new LeadModel({
    parentName: input.parentName,
    childName: input.childName,
    childAge: Number.parseInt(input.age, 10) || 0,
    medicalNotes: input.medicalNotes || '',
    operationContext: initializeDocumentContext(context, 'lead.create'),
  });

  lead.$locals = lead.$locals || {};
  lead.$locals.operationContext = lead.operationContext;

  observe(dependencies.observer, { modelName: 'Lead', operation: 'create', context });
  await lead.save();
  return lead;
}

async function createCallRecord(input, contextInput = {}, dependencies = {}) {
  const context = createMongoOperationContext(contextInput);
  const { Call: CallModel } = getModels(dependencies.models);
  const call = new CallModel({
    streamSid: input.streamSid,
    startTime: input.startTime || new Date(),
    summary: input.summary,
    status: input.status,
    operationContext: initializeDocumentContext(context, 'call.start'),
  });

  call.$locals = call.$locals || {};
  call.$locals.operationContext = call.operationContext;

  observe(dependencies.observer, { modelName: 'Call', operation: 'create', context });
  await call.save();
  return call;
}

async function completeCallRecord(input, contextInput = {}, dependencies = {}) {
  const context = createMongoOperationContext(contextInput);
  const { Call: CallModel } = getModels(dependencies.models);
  const query = CallModel.findOne({ streamSid: input.streamSid }).sort({ startTime: -1 });
  const callRecord = await withQueryContext(query, context, dependencies.observer, 'Call', 'findOne').exec();

  if (!callRecord) {
    return null;
  }

  const endTime = input.endTime || new Date();
  callRecord.endTime = endTime;
  callRecord.duration = Math.floor((endTime - callRecord.startTime) / 1000);
  if (input.summary) {
    callRecord.summary = input.summary;
  }
  if (input.status) {
    callRecord.status = input.status;
  }

  callRecord.operationContext = extendDocumentContext(
    callRecord.operationContext,
    context,
    'call.complete'
  );
  callRecord.$locals = callRecord.$locals || {};
  callRecord.$locals.operationContext = callRecord.operationContext;

  observe(dependencies.observer, { modelName: 'Call', operation: 'save', context });
  await callRecord.save();
  return callRecord;
}

async function listRecentHistory(contextInput = {}, dependencies = {}) {
  const context = createMongoOperationContext(contextInput);
  const { Lead: LeadModel, Call: CallModel } = getModels(dependencies.models);
  const leadsQuery = LeadModel.find().sort({ createdAt: -1 }).limit(10);
  const callsQuery = CallModel.find().sort({ startTime: -1 }).limit(10);

  const [historicalLeads, historicalCalls] = await Promise.all([
    withQueryContext(leadsQuery, context, dependencies.observer, 'Lead', 'find').exec(),
    withQueryContext(callsQuery, context, dependencies.observer, 'Call', 'find').exec(),
  ]);

  return { historicalLeads, historicalCalls, context };
}

async function listToyFeedback(contextInput = {}, dependencies = {}) {
  const context = createMongoOperationContext(contextInput);
  const { ToyFeedback: ToyFeedbackModel } = getModels(dependencies.models);
  const query = ToyFeedbackModel.find().sort({ weekOf: -1 }).limit(20);
  return withQueryContext(query, context, dependencies.observer, 'ToyFeedback', 'find').exec();
}

async function listRoomRatios(contextInput = {}, dependencies = {}) {
  const context = createMongoOperationContext(contextInput);
  const { RoomRatio: RoomRatioModel } = getModels(dependencies.models);
  const query = RoomRatioModel.find({});
  return withQueryContext(query, context, dependencies.observer, 'RoomRatio', 'find').exec();
}

module.exports = {
  createLeadRecord,
  createCallRecord,
  completeCallRecord,
  listRecentHistory,
  listToyFeedback,
  listRoomRatios,
};
