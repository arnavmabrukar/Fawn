require('dotenv').config();
const mongoose = require('mongoose');

const roomRatioSchema = new mongoose.Schema({
  roomName: { type: String, required: true },
  currentKids: { type: Number, default: 0 },
  maxKids: { type: Number, required: true },
  ratioLimit: { type: String, required: true },
});

const RoomRatio = mongoose.models.RoomRatio || mongoose.model('RoomRatio', roomRatioSchema);

async function seed() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is missing');
    
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(uri);
    
    console.log('[Seed] Clearing roomratios collection...');
    await RoomRatio.deleteMany({});
    
    const rooms = [
      { roomName: "Infants", currentKids: 3, maxKids: 4, ratioLimit: "1:4" },
      { roomName: "Toddlers", currentKids: 6, maxKids: 6, ratioLimit: "1:6" },
      { roomName: "Pre-K", currentKids: 8, maxKids: 12, ratioLimit: "1:12" }
    ];
    
    console.log('[Seed] Inserting 3 room ratios...');
    await RoomRatio.insertMany(rooms);
    
    console.log('[Seed] Verification check...');
    const count = await RoomRatio.countDocuments();
    console.log(`[Seed] Successfully seeded ${count} rooms!`);
    
    process.exit(0);
  } catch (err) {
    console.error('[Seed] FAILED:', err);
    process.exit(1);
  }
}

seed();
