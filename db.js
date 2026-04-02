const mongoose = require('mongoose');

const operationSnapshotSchema = new mongoose.Schema({
  stage: { type: String, required: true },
  timestamp: { type: String, required: true },
  entryPoint: { type: String },
  requestId: { type: String },
  callSid: { type: String },
  streamSid: { type: String },
  source: { type: String },
  payload: { type: mongoose.Schema.Types.Mixed },
  request: { type: mongoose.Schema.Types.Mixed },
  twilio: { type: mongoose.Schema.Types.Mixed },
  toolCall: { type: mongoose.Schema.Types.Mixed },
  notes: { type: mongoose.Schema.Types.Mixed },
}, { _id: false, strict: false });

const operationContextSchema = new mongoose.Schema({
  origin: { type: operationSnapshotSchema, required: true },
  current: { type: operationSnapshotSchema, required: true },
  events: { type: [operationSnapshotSchema], default: [] },
}, { _id: false, strict: false });

function attachOperationContext(schema) {
  schema.add({
    operationContext: {
      type: operationContextSchema,
      default: undefined,
    },
  });

  schema.pre('save', function saveOperationContext(next) {
    const operationContext = this.$locals?.operationContext;
    if (operationContext) {
      this.operationContext = operationContext;
    }
    next();
  });

  ['find', 'findOne', 'findOneAndUpdate', 'updateOne', 'updateMany'].forEach((hook) => {
    schema.pre(hook, function queryOperationContext(next) {
      const operationContext = this.getOptions().operationContext;
      this._operationContext = operationContext;

      if (operationContext && ['findOneAndUpdate', 'updateOne', 'updateMany'].includes(hook)) {
        const update = this.getUpdate() || {};
        update.$set = update.$set || {};
        if (update.$set.operationContext === undefined) {
          update.$set.operationContext = operationContext;
        }
        this.setUpdate(update);
      }

      next();
    });
  });

  ['find', 'findOne', 'findOneAndUpdate'].forEach((hook) => {
    schema.post(hook, function bindOperationContext(result) {
      const operationContext = this._operationContext;
      if (!operationContext || !result) {
        return;
      }

      if (Array.isArray(result)) {
        result.forEach((doc) => {
          if (doc) {
            doc.$locals.operationContext = operationContext;
          }
        });
        return;
      }

      result.$locals.operationContext = operationContext;
    });
  });
}

const leadSchema = new mongoose.Schema({
  parentName: { type: String, default: "Anonymous" },
  childName: { type: String, required: true },
  childAge: { type: Number },
  medicalNotes: { type: String },
  status: { type: String, enum: ['Lead', 'Waitlisted', 'Enrolled'], default: 'Lead' },
  createdAt: { type: Date, default: Date.now },
});

const callSchema = new mongoose.Schema({
  streamSid: { type: String },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  duration: { type: Number }, // seconds
  summary: { type: String },
  status: { type: String, enum: ['completed', 'failed', 'busy'], default: 'completed' },
});

const Lead = mongoose.model('Lead', leadSchema);
const Call = mongoose.model('Call', callSchema);

const toyFeedbackSchema = new mongoose.Schema({
  toy: { type: String, required: true },
  emoji: { type: String },
  teacher: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5 },
  quote: { type: String },
  tags: [{ type: String }],
  weekOf: { type: Date, default: Date.now },
});

const ToyFeedback = mongoose.model('ToyFeedback', toyFeedbackSchema);

const roomRatioSchema = new mongoose.Schema({
  roomName: { type: String, required: true }, // e.g. "Infants", "Toddlers", "Pre-K"
  currentKids: { type: Number, default: 0 },
  maxKids: { type: Number, required: true },
  ratioLimit: { type: String, required: true }, // e.g. "1:4"
});

[
  leadSchema,
  callSchema,
  toyFeedbackSchema,
  roomRatioSchema,
].forEach(attachOperationContext);

const RoomRatio = mongoose.model('RoomRatio', roomRatioSchema);


const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('[DB] MONGODB_URI is missing in .env');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[DB] MongoDB Connected Successfully');
  } catch (err) {
    console.error('[DB] Connection Error:', err.message);
    process.exit(1);
  }
};

module.exports = { connectDB, Lead, Call, ToyFeedback, RoomRatio };
