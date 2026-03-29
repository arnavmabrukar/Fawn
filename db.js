const mongoose = require('mongoose');

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

module.exports = { connectDB, Lead, Call, ToyFeedback };
