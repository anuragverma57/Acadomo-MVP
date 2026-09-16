const ROOM_TYPE_LABELS: Record<string, string> = {
  studio: "Studio",
  ensuite: "En-suite",
  shared: "Shared room",
  apartment: "Apartment",
};

export function roomTypeLabel(roomType: string): string {
  return ROOM_TYPE_LABELS[roomType] ?? roomType;
}

/** Minor units (pence) -> "£385". Whole pounds: student rents are never £385.50. */
export function formatPrice(minorUnits: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(minorUnits / 100);
}

export function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}
