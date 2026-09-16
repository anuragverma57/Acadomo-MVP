import { config } from "dotenv";

// Preloaded via `tsx --import` so .env.local is populated before the db client
// module reads DATABASE_URL at import time. Next.js loads .env.local itself;
// this is only for standalone scripts.
// override:false — a real environment variable (Vercel, CI) always wins over
// the local file, so the same scripts work in both places.
config({ path: ".env.local", override: false });
