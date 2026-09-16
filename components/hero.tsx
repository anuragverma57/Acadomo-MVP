import { UniversityMarquee } from "@/components/university-marquee";

/**
 * Landing hero. Deliberately ~60vh rather than full-screen: this is a product
 * a student scans, so the results grid must stay reachable without scrolling
 * far. Gradient wash instead of a photo keeps first paint instant.
 */
export function Hero({
  universities,
  propertyCount,
  cityCount,
}: {
  universities: string[];
  propertyCount: number;
  cityCount: number;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Warm tonal wash + hairline grid, both purely decorative. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_0%,var(--accent)_0%,transparent_70%)] opacity-70"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:56px_56px]"
      />

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-14 md:px-6 md:pb-14 md:pt-20">
        <div className="animate-fade-up max-w-3xl">
          <p className="text-eyebrow text-primary">
            Student housing, worldwide
          </p>

          <h1 className="text-display mt-4 text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
            Find your place
            <br />
            near campus.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground text-pretty md:text-lg">
            Compare{" "}
            <span className="tabular font-medium text-foreground">
              {propertyCount}
            </span>{" "}
            verified student homes across{" "}
            <span className="tabular font-medium text-foreground">
              {cityCount}
            </span>{" "}
            cities. Filter by university, room type and weekly budget — no
            account needed.
          </p>
        </div>
      </div>

      <div
        className="animate-fade-up pb-8"
        style={{ animationDelay: "80ms" }}
      >
        <UniversityMarquee universities={universities} />
      </div>
    </section>
  );
}
