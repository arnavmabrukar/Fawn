require('dotenv').config();
const { connectDB, ToyFeedback } = require('./db');

const TOY_RECORDS = [
  {
    toy: "Dinosaur Dig Kit",
    emoji: "🦕",
    teacher: "Ms. Rivera",
    rating: 5,
    quote: "Kids couldn't put them down! Every child was engaged for over 40 minutes.",
    tags: ["STEM", "Sensory", "Independent Play"],
    weekOf: new Date("2026-03-22"),
  },
  {
    toy: "Kinetic Sand Table",
    emoji: "🏖️",
    teacher: "Mr. Chen",
    rating: 4,
    quote: "Great sensory exploration. A few needed redirection but overall very calming.",
    tags: ["Sensory", "Fine Motor"],
    weekOf: new Date("2026-03-23"),
  },
  {
    toy: "Mega Block Puzzle",
    emoji: "🟦",
    teacher: "Ms. Okafor",
    rating: 5,
    quote: "Incredible focus and teamwork. Kids were helping each other without prompting!",
    tags: ["Teamwork", "Cognitive", "Fine Motor"],
    weekOf: new Date("2026-03-24"),
  },
  {
    toy: "Toy Kitchen Set",
    emoji: "🍳",
    teacher: "Ms. Rivera",
    rating: 3,
    quote: "Popular but gets chaotic fast. Works better in small groups of 2-3.",
    tags: ["Role Play", "Social"],
    weekOf: new Date("2026-03-24"),
  },
  {
    toy: "Magnetic Tiles",
    emoji: "🔷",
    teacher: "Mr. Chen",
    rating: 4,
    quote: "Loved by the older kids (4-5yr). Younger ones struggled a bit but stayed curious.",
    tags: ["STEM", "Creativity", "3D Thinking"],
    weekOf: new Date("2026-03-25"),
  },
  {
    toy: "Finger Paints",
    emoji: "🎨",
    teacher: "Ms. Okafor",
    rating: 3,
    quote: "Messy but joyful. Several kids painted for the first time and were beaming.",
    tags: ["Art", "Sensory", "Expression"],
    weekOf: new Date("2026-03-26"),
  },
  {
    toy: "Animal Puppets",
    emoji: "🐸",
    teacher: "Ms. Rivera",
    rating: 4,
    quote: "Big hit during circle time. Kids started making up their own stories!",
    tags: ["Language", "Creativity", "Social"],
    weekOf: new Date("2026-03-27"),
  },
];

async function seed() {
  await connectDB();
  
  // Clear existing toy feedback to avoid duplicates
  await ToyFeedback.deleteMany({});
  console.log('[Seed] Cleared existing toy feedback records.');
  
  await ToyFeedback.insertMany(TOY_RECORDS);
  console.log(`[Seed] ✅ Inserted ${TOY_RECORDS.length} toy feedback records into MongoDB!`);
  
  process.exit(0);
}

seed().catch(err => {
  console.error('[Seed] Error:', err.message);
  process.exit(1);
});
