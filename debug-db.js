require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('Connected to DB:', db.databaseName);
  console.log('Collections:', collections.map(c => c.name));
  
  const roomratios = await db.collection('roomratios').find({}).toArray();
  console.log('RoomRatios count:', roomratios.length);
  console.log('Data:', JSON.stringify(roomratios, null, 2));
  
  process.exit(0);
}
check();
