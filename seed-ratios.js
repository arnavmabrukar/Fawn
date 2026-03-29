require('dotenv').config({ path: 'c:/Users/reyaz/Downloads/fawnai/.env' });
const mongoose = require('mongoose');
const { RoomRatio } = require('c:/Users/reyaz/Downloads/fawnai/db.js');

const seedRatios = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[DB] MongoDB Connected for Seeding Room Ratios');

    // Clear existing
    await RoomRatio.deleteMany({});
    console.log('[DB] Cleared existing room ratios');

    const ratios = [
      {
        roomName: "Infants",
        currentKids: 3,
        maxKids: 4,
        ratioLimit: "1:4"
      },
      {
        roomName: "Toddlers",
        currentKids: 6,
        maxKids: 6,
        ratioLimit: "1:6" // Full limit
      },
      {
        roomName: "Pre-K",
        currentKids: 8,
        maxKids: 12,
        ratioLimit: "1:12"
      }
    ];

    await RoomRatio.insertMany(ratios);
    console.log('[DB] Inserted 3 Room Ratios Successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
};

seedRatios();
