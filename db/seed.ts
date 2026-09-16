/**
 * Seeds the database with realistic demo data.
 * Run with: npm run db:seed   (after npm run db:reset)
 */
import bcrypt from "bcryptjs";

import { pool, query } from "../lib/db/client";

type SeedProperty = {
  title: string;
  city: string;
  country: string;
  university: string;
  pricePerWeek: number; // minor units (pence)
  roomType: "studio" | "ensuite" | "shared" | "apartment";
  description: string;
  amenities: string[];
  imageUrl: string;
};

const IMAGES = [
  "photo-1522708323590-d24dbb6b0267",
  "photo-1502672260266-1c1ef2d93688",
  "photo-1560448204-e02f11c3d0e2",
  "photo-1493809842364-78817add7ffb",
  "photo-1586023492125-27b2c045efd7",
  "photo-1555854877-bab0e564b8d5",
  "photo-1484154218962-a197022b5858",
  "photo-1522771739844-6a9f6d5f14af",
  "photo-1502005229762-cf1b2da7c5d6",
  "photo-1598928506311-c55ded91a20c",
  "photo-1556020685-ae41abfc9365",
  "photo-1507089947368-19c1da9775ae",
  "photo-1560185893-a55cbc8c57e8",
  "photo-1522798514-97ceb8c4f1c8",
  "photo-1580041065738-e72023775cdc",
];

const img = (i: number) =>
  `https://images.unsplash.com/${IMAGES[i % IMAGES.length]}?auto=format&fit=crop&w=1200&q=70`;

const PROPERTIES: SeedProperty[] = [
  {
    title: "Iona House — Premium Studio",
    city: "London", country: "United Kingdom", university: "University College London",
    pricePerWeek: 38500, roomType: "studio",
    description:
      "A bright self-contained studio a ten-minute walk from the UCL main campus. Floor-to-ceiling windows, a private kitchenette and a generous study desk make this a favourite with postgraduate students.",
    amenities: ["En-suite bathroom", "Private kitchenette", "High-speed Wi-Fi", "Bills included", "On-site gym", "24/7 security"],
    imageUrl: img(0),
  },
  {
    title: "Bloomsbury Court — Classic En-suite",
    city: "London", country: "United Kingdom", university: "University College London",
    pricePerWeek: 29500, roomType: "ensuite",
    description:
      "En-suite room in a friendly 6-bedroom flat with a shared kitchen and lounge. Set on a quiet garden square, but two minutes from Russell Square station.",
    amenities: ["En-suite bathroom", "Shared kitchen", "Communal lounge", "Laundry room", "Bills included", "Bike storage"],
    imageUrl: img(1),
  },
  {
    title: "Camden Lock Apartments — One Bed",
    city: "London", country: "United Kingdom", university: "King's College London",
    pricePerWeek: 45000, roomType: "apartment",
    description:
      "A full one-bedroom apartment overlooking the canal at Camden Lock. Separate living room, full kitchen and a dedicated workspace — ideal if you want genuine privacy.",
    amenities: ["Full kitchen", "Separate living room", "Balcony", "Concierge", "Bills included", "Pet friendly"],
    imageUrl: img(2),
  },
  {
    title: "Waterloo Studios — Compact Studio",
    city: "London", country: "United Kingdom", university: "King's College London",
    pricePerWeek: 33000, roomType: "studio",
    description:
      "Efficient studio living minutes from the King's Waterloo campus. Everything you need without the London price tag of a full apartment.",
    amenities: ["En-suite bathroom", "Kitchenette", "Study lounge", "High-speed Wi-Fi", "Bills included"],
    imageUrl: img(3),
  },
  {
    title: "Oxford Road Residence — Shared Twin",
    city: "Manchester", country: "United Kingdom", university: "University of Manchester",
    pricePerWeek: 14500, roomType: "shared",
    description:
      "Affordable twin room on the Oxford Road corridor, directly on the bus route to campus. The best value option for first-year students.",
    amenities: ["Shared bathroom", "Shared kitchen", "Study room", "Laundry room", "Bills included"],
    imageUrl: img(4),
  },
  {
    title: "Victoria Mills — En-suite Room",
    city: "Manchester", country: "United Kingdom", university: "University of Manchester",
    pricePerWeek: 19900, roomType: "ensuite",
    description:
      "Converted textile mill with high ceilings and exposed brick. En-suite rooms in shared apartments of four, with a residents' cinema room downstairs.",
    amenities: ["En-suite bathroom", "Shared kitchen", "Cinema room", "On-site gym", "Bills included", "24/7 security"],
    imageUrl: img(5),
  },
  {
    title: "Deansgate Heights — Studio",
    city: "Manchester", country: "United Kingdom", university: "Manchester Metropolitan University",
    pricePerWeek: 23500, roomType: "studio",
    description:
      "City-centre studio on Deansgate with skyline views from the upper floors. A fifteen-minute walk to the MMU campus.",
    amenities: ["En-suite bathroom", "Private kitchenette", "Rooftop terrace", "On-site gym", "Bills included"],
    imageUrl: img(6),
  },
  {
    title: "Newington Place — En-suite",
    city: "Edinburgh", country: "United Kingdom", university: "University of Edinburgh",
    pricePerWeek: 21500, roomType: "ensuite",
    description:
      "Georgian townhouse conversion in Newington, a short walk across the Meadows to the George Square campus. Period features with modern fittings.",
    amenities: ["En-suite bathroom", "Shared kitchen", "Garden access", "Study room", "Bills included", "Bike storage"],
    imageUrl: img(7),
  },
  {
    title: "Holyrood View — Premium Studio",
    city: "Edinburgh", country: "United Kingdom", university: "University of Edinburgh",
    pricePerWeek: 27500, roomType: "studio",
    description:
      "Modern studio with views toward Arthur's Seat. Purpose-built for students, with a quiet study floor and a large communal kitchen for when you want company.",
    amenities: ["En-suite bathroom", "Private kitchenette", "Study lounge", "On-site gym", "Bills included", "24/7 security"],
    imageUrl: img(8),
  },
  {
    title: "Leith Walk Apartments — Two Bed",
    city: "Edinburgh", country: "United Kingdom", university: "Heriot-Watt University",
    pricePerWeek: 31000, roomType: "apartment",
    description:
      "Two-bedroom apartment on Leith Walk, ideal to share with a friend. Full kitchen, living room and direct bus links to the Riccarton campus.",
    amenities: ["Full kitchen", "Separate living room", "Laundry room", "Bike storage", "Pet friendly"],
    imageUrl: img(9),
  },
  {
    title: "Selly Oak House — Shared Room",
    city: "Birmingham", country: "United Kingdom", university: "University of Birmingham",
    pricePerWeek: 12500, roomType: "shared",
    description:
      "Classic Selly Oak student house in the heart of the student district. Shared rooms at the lowest price point in our Birmingham portfolio.",
    amenities: ["Shared bathroom", "Shared kitchen", "Garden access", "Laundry room", "Bills included"],
    imageUrl: img(10),
  },
  {
    title: "Edgbaston Park — En-suite",
    city: "Birmingham", country: "United Kingdom", university: "University of Birmingham",
    pricePerWeek: 18500, roomType: "ensuite",
    description:
      "Purpose-built en-suite accommodation directly opposite the Edgbaston campus. Walk to lectures in under five minutes.",
    amenities: ["En-suite bathroom", "Shared kitchen", "Study room", "On-site gym", "Bills included", "24/7 security"],
    imageUrl: img(11),
  },
  {
    title: "Jewellery Quarter Lofts — Studio",
    city: "Birmingham", country: "United Kingdom", university: "University of Birmingham",
    pricePerWeek: 22000, roomType: "studio",
    description:
      "Loft-style studio in a converted workshop in the Jewellery Quarter. Exposed beams, tall windows and a genuinely quiet street.",
    amenities: ["En-suite bathroom", "Private kitchenette", "Rooftop terrace", "High-speed Wi-Fi", "Bills included"],
    imageUrl: img(12),
  },
  {
    title: "Kelvinbridge Residence — En-suite",
    city: "Glasgow", country: "United Kingdom", university: "University of Glasgow",
    pricePerWeek: 17500, roomType: "ensuite",
    description:
      "En-suite rooms beside the Kelvin river walkway, ten minutes on foot from the Gilmorehill campus. Popular with returning students.",
    amenities: ["En-suite bathroom", "Shared kitchen", "Communal lounge", "Laundry room", "Bills included", "Bike storage"],
    imageUrl: img(13),
  },
  {
    title: "Finnieston Quarter — One Bed",
    city: "Glasgow", country: "United Kingdom", university: "University of Glasgow",
    pricePerWeek: 26000, roomType: "apartment",
    description:
      "One-bedroom apartment in Finnieston, surrounded by Glasgow's best restaurants. Full kitchen, separate living space and a short subway ride to campus.",
    amenities: ["Full kitchen", "Separate living room", "Balcony", "Concierge", "Pet friendly", "Bills included"],
    imageUrl: img(14),
  },
];

/** "Iona House — Premium Studio" + London -> "iona-house-premium-studio-london" */
function slugify(title: string, city: string): string {
  return `${title} ${city}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function seed() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env.local");
  }

  // Truncate rather than drop: keeps the schema, resets identity counters, and
  // CASCADE clears dependent enquiries in one statement.
  await query("TRUNCATE properties, enquiries, students, otp_codes, admin_users RESTART IDENTITY CASCADE");

  for (const p of PROPERTIES) {
    await query(
      `INSERT INTO properties
         (title, slug, city, country, university, price_per_week, currency, room_type, description, amenities, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        p.title,
        slugify(p.title, p.city),
        p.city,
        p.country,
        p.university,
        p.pricePerWeek,
        "GBP",
        p.roomType,
        p.description,
        p.amenities,
        p.imageUrl,
      ],
    );
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await query(
    `INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, $3)`,
    [adminEmail, passwordHash, "super_admin"],
  );

  const [{ count: propertyCount }] = await query<{ count: number }>(
    "SELECT count(*)::int AS count FROM properties",
  );
  const [{ count: cityCount }] = await query<{ count: number }>(
    "SELECT count(DISTINCT city)::int AS count FROM properties",
  );
  const [{ count: uniCount }] = await query<{ count: number }>(
    "SELECT count(DISTINCT university)::int AS count FROM properties",
  );

  console.log(`✓ ${propertyCount} properties across ${cityCount} cities and ${uniCount} universities`);
  console.log(`✓ admin user: ${adminEmail} (role: super_admin)`);
}

seed()
  .then(() => pool.end())
  .catch((error) => {
    console.error("Seed failed:", error);
    pool.end();
    process.exit(1);
  });
