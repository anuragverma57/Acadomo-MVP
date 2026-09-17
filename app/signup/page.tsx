import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/signup-form";
import { currentStudent } from "@/lib/session";
import { safeRedirect } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to save properties and track your enquiries.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // Validated server-side: only same-site paths survive, so ?next= cannot be
  // turned into an open redirect.
  const next = safeRedirect(params.next, "/");

  if (await currentStudent()) {
    redirect(next);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="text-display text-3xl">Sign in to AcaDomo</h1>
      <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
        Students: save properties and track enquiries. Staff: manage enquiries.
      </p>
      <div className="mt-8">
        <SignupForm next={next} />
      </div>
    </div>
  );
}
