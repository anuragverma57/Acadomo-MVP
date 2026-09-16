import { notFound, ok, serverError } from "@/lib/api";
import { findPropertyBySlug } from "@/lib/services/properties";

/** GET /api/properties/[slug] */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const property = await findPropertyBySlug(slug);

    if (!property) {
      return notFound("Property not found");
    }

    return ok(property);
  } catch (error) {
    return serverError("GET /api/properties/[slug]", error);
  }
}
