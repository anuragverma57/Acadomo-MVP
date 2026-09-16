import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <section className="max-w-2xl">
        <p className="text-sm font-medium text-primary">Phase 0 · Foundation</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance md:text-5xl">
          Student accommodation, without the guesswork.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground text-pretty">
          Discover, compare and enquire about verified student housing across
          global study destinations.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg">Browse properties</Button>
          <Button size="lg" variant="outline">
            How it works
          </Button>
        </div>
      </section>

      <section className="mt-16 rounded-lg border border-border bg-muted/40 p-6">
        <h2 className="text-sm font-semibold">Scaffold checklist</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <li>App shell — header on desktop, bottom tabs on mobile</li>
          <li>Dark mode — light / dark / system, no flash on load</li>
          <li>Safe-area insets for installed-PWA layout</li>
          <li>Next: database schema and seed data (Phase 1)</li>
        </ul>
      </section>
    </div>
  );
}
