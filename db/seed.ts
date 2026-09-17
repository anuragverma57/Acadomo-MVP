/**
 * Seeds the database with realistic demo data.
 * Run with: npm run db:seed   (after npm run db:reset)
 */
import { createHash } from "node:crypto";

import bcrypt from "bcryptjs";

import { getPool, query } from "../lib/db/client";

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


// ---------------------------------------------------------------------------
// Generated listings — expands the catalogue beyond the 15 hand-written ones
// so pagination, filtering and analytics have realistic volume.
// ---------------------------------------------------------------------------

const CITY_UNIS: Array<[string, string[], number]> = [
  ["London", ["University College London", "King's College London", "Imperial College London", "LSE"], 1.0],
  ["Manchester", ["University of Manchester", "Manchester Metropolitan University"], 0.62],
  ["Edinburgh", ["University of Edinburgh", "Heriot-Watt University"], 0.72],
  ["Birmingham", ["University of Birmingham", "Aston University"], 0.55],
  ["Glasgow", ["University of Glasgow", "University of Strathclyde"], 0.58],
  ["Leeds", ["University of Leeds", "Leeds Beckett University"], 0.56],
  ["Bristol", ["University of Bristol", "UWE Bristol"], 0.68],
  ["Nottingham", ["University of Nottingham", "Nottingham Trent University"], 0.52],
  ["Sheffield", ["University of Sheffield", "Sheffield Hallam University"], 0.5],
  ["Liverpool", ["University of Liverpool", "Liverpool John Moores University"], 0.53],
];

const BUILDING_NAMES = [
  "Ashfield Court", "Riverside Point", "The Foundry", "Granary Wharf",
  "Kingsgate House", "Elmwood Place", "Station View", "The Maltings",
  "Cornerstone Studios", "Parkside Halls", "Old Mill Quarter", "Beacon House",
  "Trinity Gardens", "Willow Court", "The Exchange", "Northgate Lofts",
  "Abbey Fields", "Central Quay", "Hollybrook House", "The Printworks",
  "Sycamore Place", "Regent Court", "Meadowbank", "Bridgewater Studios",
  "Castlegate", "The Clockhouse", "Fairview Halls", "Union Square",
  "Chapel Yard", "Lakeside Court", "Brunel House", "The Arches",
  "Orchard Place", "Victoria Quarter", "Summerfield", "Priory Court",
  "The Granary", "Westbourne House", "Camden Yards", "Highfield Halls",
  "Stonebridge", "The Weaving Shed", "Rosebank Court", "Eastgate Studios",
];

const ROOM_MIX: Array<[SeedProperty["roomType"], number]> = [
  ["studio", 1.35],
  ["ensuite", 1.0],
  ["shared", 0.72],
  ["apartment", 1.6],
];

const AMENITY_POOL = [
  "En-suite bathroom", "Shared kitchen", "High-speed Wi-Fi", "Bills included",
  "On-site gym", "24/7 security", "Laundry room", "Study lounge",
  "Bike storage", "Communal lounge", "Cinema room", "Rooftop terrace",
  "Courtyard garden", "Parcel collection", "Contents insurance",
];

function generatedProperties(): SeedProperty[] {
  const out: SeedProperty[] = [];
  let i = 0;

  for (const [city, unis, priceFactor] of CITY_UNIS) {
    // Bigger cities carry more stock, which keeps city filters uneven and real.
    const count = city === "London" ? 7 : 4 + (i % 2);

    for (let n = 0; n < count; n += 1) {
      const [roomType, roomFactor] = ROOM_MIX[(i + n) % ROOM_MIX.length]!;
      const name = BUILDING_NAMES[i % BUILDING_NAMES.length]!;
      const university = unis[n % unis.length]!;

      // Deterministic pseudo-variance: same seed run produces the same data.
      const jitter = ((i * 37 + n * 13) % 21) - 10;
      const price = Math.round(
        (14000 * priceFactor * roomFactor + jitter * 350) / 500,
      ) * 500;

      const amenityCount = 4 + ((i + n) % 3);
      const amenities = Array.from(
        { length: amenityCount },
        (_, a) => AMENITY_POOL[(i * 3 + n * 5 + a) % AMENITY_POOL.length]!,
      ).filter((value, index, arr) => arr.indexOf(value) === index);

      out.push({
        title: `${name} — ${roomTypeTitle(roomType)}`,
        city,
        country: "United Kingdom",
        university,
        pricePerWeek: Math.max(9500, price),
        roomType,
        description:
          `${roomType === "shared" ? "Shared" : roomType === "apartment" ? "Self-contained" : "Private"} accommodation in ${city}, ` +
          `a short journey from ${university}. Purpose-built for students with on-site support, ` +
          `secure entry and communal spaces designed for both study and downtime.`,
        amenities,
        imageUrl: img(i + n + 3),
      });

      i += 1;
    }
  }

  return out;
}

function roomTypeTitle(roomType: SeedProperty["roomType"]): string {
  return roomType === "ensuite"
    ? "En-suite"
    : roomType === "shared"
      ? "Shared Room"
      : roomType === "apartment"
        ? "Apartment"
        : "Studio";
}

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
  await query("TRUNCATE properties, enquiries, students, otp_codes, admin_users, property_views RESTART IDENTITY CASCADE");

  const allProperties = [...PROPERTIES, ...generatedProperties()];

  for (const p of allProperties) {
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

  // Hide a spread of listings across cities so the is_active filter is
  // visibly doing something without gutting any one city.
  await query(
    `UPDATE properties SET is_active = false
      WHERE id IN (SELECT id FROM properties ORDER BY (id * 7) % 23 LIMIT 6)`,
  );

  // Backdated enquiries so Phase 9's "enquiries over time" has a real shape.
  // All-today rows would render as a single spike and prove nothing.
  const names = [
    "Aisha Khan", "Marco Rossi", "Chen Wei", "Priya Sharma", "Tom Becker",
    "Sofia Almeida", "Yuki Tanaka", "Omar Haddad", "Lena Novak", "Diego Silva",
    "Ana Petrova", "Raj Patel", "Emma Dubois", "Kwame Mensah", "Sara Lindqvist",
  ];

  const active = await query<{ id: number }>(
    "SELECT id FROM properties WHERE is_active = true ORDER BY id",
  );

  let seeded = 0;
  for (let day = 89; day >= 0; day -= 1) {
    // Gentle upward trend plus weekday variation, so the chart reads naturally.
    const base = 2 + Math.floor((89 - day) / 22);
    const count = Math.max(0, base + (day % 7 === 0 ? 3 : 0) - (day % 5 === 0 ? 1 : 0));

    for (let n = 0; n < count; n += 1) {
      const property = active[(day + n) % active.length]!;
      const name = names[(day + n) % names.length]!;
      const email = `${name.toLowerCase().replace(/[^a-z]/g, ".")}@example.com`;
      // Older enquiries are more likely to have been actioned.
      const status = day > 30 ? (n % 4 === 0 ? "new" : "contacted") : n % 3 === 0 ? "contacted" : "new";

      await query(
        `INSERT INTO enquiries
           (property_id, name, email, phone, message, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, now() - ($7 || ' days')::interval - ($8 || ' hours')::interval)`,
        [
          property.id,
          name,
          email,
          `+4477009${String(1000 + seeded).slice(-5)}`,
          "Is this available for the coming academic year? I'd like to arrange a viewing.",
          status,
          day,
          (n * 5 + day) % 24,
        ],
      );
      seeded += 1;
    }
  }

  // Backdated views, correlated with the enquiries above.
  //
  // Views are generated per property per day from the same daily shape, then
  // scaled up: a listing that received an enquiry that day gets proportionally
  // more views. Random views uncorrelated with enquiries would produce a
  // conversion rate that is pure noise, which defeats the metric.
  //
  // Batched into multi-row INSERTs — ~9k individual round trips to a pooler in
  // another region takes minutes; this takes seconds.
  const perDayEnquiries = await query<{ day: number; property_id: number; n: number }>(
    `SELECT (date_part('day', now() - created_at))::int AS day,
            property_id,
            count(*)::int AS n
       FROM enquiries
      GROUP BY 1, 2`,
  );

  const enquiriesByKey = new Map<string, number>();
  for (const row of perDayEnquiries) {
    enquiriesByKey.set(`${row.day}:${row.property_id}`, row.n);
  }

  // Deterministic pseudo-random, so a reseed produces the same chart.
  let seedState = 42;
  const rand = () => {
    seedState = (seedState * 1664525 + 1013904223) % 4294967296;
    return seedState / 4294967296;
  };

  const viewRows: string[] = [];
  const viewParams: unknown[] = [];
  let viewCount = 0;

  const flushViews = async () => {
    if (viewRows.length === 0) return;
    await query(
      `INSERT INTO property_views (property_id, visitor_hash, viewed_at) VALUES ${viewRows.join(", ")}`,
      viewParams,
    );
    viewRows.length = 0;
    viewParams.length = 0;
  };

  for (let day = 89; day >= 0; day -= 1) {
    for (const property of active) {
      const enquiriesToday = enquiriesByKey.get(`${day}:${property.id}`) ?? 0;

      // Baseline browsing traffic, trending up like the enquiry curve, plus
      // roughly 12-25 views for each enquiry that property received that day.
      const base = 1 + Math.floor((89 - day) / 30);
      const noise = rand() < 0.45 ? 1 : 0;
      const fromEnquiries = enquiriesToday * (12 + Math.floor(rand() * 14));
      const count = base + noise + fromEnquiries;

      for (let n = 0; n < count; n += 1) {
        const i = viewParams.length;
        viewRows.push(
          `($${i + 1}, $${i + 2}, now() - ($${i + 3} || ' days')::interval - ($${i + 4} || ' hours')::interval)`,
        );
        viewParams.push(
          property.id,
          // A plausible spread of distinct visitors; hashed exactly as the
          // application would store them.
          createHash("sha256").update(`seed:${day}:${property.id}:${n}`).digest("hex"),
          day,
          Math.floor(rand() * 24),
        );
        viewCount += 1;

        // Keep each statement well under Postgres' 65535-parameter ceiling.
        if (viewParams.length >= 4000) await flushViews();
      }
    }
  }
  await flushViews();

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

  const [{ count: enquiryCount }] = await query<{ count: number }>(
    "SELECT count(*)::int AS count FROM enquiries",
  );
  const [{ count: hiddenCount }] = await query<{ count: number }>(
    "SELECT count(*)::int AS count FROM properties WHERE is_active = false",
  );

  console.log(`✓ ${propertyCount} properties across ${cityCount} cities and ${uniCount} universities (${hiddenCount} hidden)`);
  console.log(`✓ ${enquiryCount} enquiries backdated across 90 days`);
  console.log(`✓ ${viewCount} property views backdated and correlated with enquiries`);
  console.log(`✓ admin user: ${adminEmail} (role: super_admin)`);
}

seed()
  .then(() => getPool().end())
  .catch((error) => {
    console.error("Seed failed:", error);
    getPool().end();
    process.exit(1);
  });
