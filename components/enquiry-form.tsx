"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { enquiryInputSchema, type EnquiryInput } from "@/lib/validation";

type Props = {
  propertyId: number;
  propertyTitle: string;
  /** Prefilled from the student session when signed in. */
  defaultName?: string;
  defaultEmail?: string;
};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

export function EnquiryForm({
  propertyId,
  propertyTitle,
  defaultName = "",
  defaultEmail = "",
}: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EnquiryInput>({
    // The same schema the API route validates with — client-side is UX,
    // server-side is the security boundary (CLAUDE.md §3).
    resolver: standardSchemaResolver(enquiryInputSchema),
    defaultValues: {
      propertyId,
      name: defaultName,
      email: defaultEmail,
      phone: "",
      message: "",
      company: "",
    },
  });

  async function onSubmit(values: EnquiryInput) {
    setFormError(null);

    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // Map server-side field errors back onto the form so the user sees
        // them inline, not as a generic banner.
        const fields = data?.fields as Record<string, string> | undefined;
        if (fields) {
          for (const [field, message] of Object.entries(fields)) {
            if (field in values) {
              setError(field as keyof EnquiryInput, { message });
            }
          }
        }
        setFormError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setFormError(
        "We couldn't send your enquiry. Check your connection and try again.",
      );
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-6 text-center">
        <CheckCircle2
          className="mx-auto size-10 text-primary"
          aria-hidden
        />
        <h3 className="mt-3 font-semibold">Enquiry sent</h3>
        <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
          Thanks — we&apos;ve passed your details to the team for{" "}
          <span className="font-medium text-foreground">{propertyTitle}</span>.
          They&apos;ll be in touch by email shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <input type="hidden" {...register("propertyId", { valueAsNumber: true })} />

      {/* Honeypot: hidden from users, irresistible to bots. Not aria-hidden
          alone — screen readers must skip it too, hence tabIndex and the label. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="company">Company (leave blank)</label>
        <input
          id="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("company")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">Full name</Label>
        <Input
          id="name"
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
          {...register("name")}
        />
        <FieldError id="name-error" message={errors.name?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          <FieldError id="email-error" message={errors.email?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+44 7700 900123"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            {...register("phone")}
          />
          <FieldError id="phone-error" message={errors.phone?.message} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          rows={4}
          placeholder="When are you looking to move in? Any questions about the property?"
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-error" : undefined}
          {...register("message")}
        />
        <FieldError id="message-error" message={errors.message?.message} />
      </div>

      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Sending…
          </>
        ) : (
          "Send enquiry"
        )}
      </Button>

      <p className="text-xs text-muted-foreground">
        We&apos;ll only use your details to respond to this enquiry.
      </p>
    </form>
  );
}
