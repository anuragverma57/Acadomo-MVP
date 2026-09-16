import { z } from "zod";

/**
 * Shared validation schemas. The client uses these for UX; the server uses the
 * same objects as the actual security boundary. Client-side validation is a
 * convenience and can always be bypassed — see CLAUDE.md §3.
 */

export const ROOM_TYPES = ["studio", "ensuite", "shared", "apartment"] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const SORT_KEYS = ["newest", "price_asc", "price_desc"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const ENQUIRY_STATUSES = ["new", "contacted"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const MAX_PAGE_SIZE = 24;

/** Coerces "" and absent to undefined so blank query params don't fail parsing. */
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional();

/** Price bounds arrive as query strings in minor units (pence). */
const optionalPrice = z.coerce
  .number()
  .int("Price must be a whole number")
  .nonnegative("Price cannot be negative")
  .max(1_000_000, "Price is out of range")
  .optional();

export const propertyFiltersSchema = z
  .object({
    q: optionalText.pipe(z.string().max(100).optional()),
    city: optionalText,
    university: optionalText,
    roomType: z.enum(ROOM_TYPES).optional(),
    minPrice: optionalPrice,
    maxPrice: optionalPrice,
    sort: z.enum(SORT_KEYS).default("newest"),
    page: z.coerce.number().int().min(1).max(500).default(1),
    pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(12),
  })
  // A reversed range would silently return zero rows; reject it explicitly so
  // the client can show a real message instead of an empty grid.
  .refine(
    (f) => f.minPrice === undefined || f.maxPrice === undefined || f.minPrice <= f.maxPrice,
    { message: "Minimum price cannot exceed maximum price", path: ["minPrice"] },
  );

export type PropertyFilters = z.infer<typeof propertyFiltersSchema>;

/**
 * Phone numbers vary wildly by country; validating format strictly rejects
 * legitimate international students. Check length and allowed characters only.
 */
const phoneSchema = z
  .string()
  .trim()
  .min(6, "Enter a valid phone number")
  .max(20, "Phone number is too long")
  .regex(/^[+\d][\d\s()-]*$/, "Enter a valid phone number");

export const enquiryInputSchema = z.object({
  propertyId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2, "Enter your name").max(100),
  email: z.email("Enter a valid email address").trim().toLowerCase().max(255),
  phone: phoneSchema,
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little more (at least 10 characters)")
    .max(2000, "Message is too long"),
  // Honeypot: a real user never sees this field, so any value means a bot.
  // Named innocuously because bots fill fields by name.
  //
  // Deliberately NOT rejected here. A validation error would name the field and
  // tell the bot exactly what caught it. The schema accepts any value; the
  // service detects it and responds with a normal success (see
  // lib/services/enquiries.ts).
  company: z.string().max(200).optional(),
});

export type EnquiryInput = z.infer<typeof enquiryInputSchema>;

export const adminLoginSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase().max(255),
  password: z.string().min(1, "Enter your password").max(200),
});

export type AdminLogin = z.infer<typeof adminLoginSchema>;

export const enquiryStatusSchema = z.object({
  status: z.enum(ENQUIRY_STATUSES),
});

/** Flattens Zod issues into { field: message } for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    result[key] ??= issue.message;
  }
  return result;
}
