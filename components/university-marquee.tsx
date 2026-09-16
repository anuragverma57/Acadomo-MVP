import Link from "next/link";

/**
 * Continuous ticker of the universities actually present in the database.
 *
 * Decorative marquees are costume; this one carries information — it signals
 * coverage and each chip is a real filter link, so it doubles as discovery.
 */
export function UniversityMarquee({ universities }: { universities: string[] }) {
  if (universities.length === 0) return null;

  // Two identical copies: the animation translates exactly -50%, so the second
  // copy lands where the first began and the loop is seamless.
  const track = [...universities, ...universities];

  return (
    <div className="marquee-mask group relative overflow-hidden py-1">
      <ul className="animate-marquee flex w-max gap-3 group-hover:[animation-play-state:paused]">
        {track.map((university, index) => (
          <li key={`${university}-${index}`}>
            <Link
              href={`/?university=${encodeURIComponent(university)}`}
              // The duplicated half is decorative; hide it from screen readers
              // so the list is not announced twice.
              aria-hidden={index >= universities.length}
              tabIndex={index >= universities.length ? -1 : undefined}
              className="inline-flex items-center whitespace-nowrap rounded-full border border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {university}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
