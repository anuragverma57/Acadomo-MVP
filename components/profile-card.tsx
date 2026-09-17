"use client";

import { useState } from "react";
import { useController, useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2, Pencil, UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Student } from "@/lib/db/queries";
import {
  studentProfileSchema,
  type StudentProfileFormValues,
  type StudentProfileInput,
} from "@/lib/validation";

const GENDER_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const UNSET = "__unset__";

function genderLabel(value: string | null) {
  return GENDER_OPTIONS.find((option) => option.value === value)?.label ?? null;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

/** One row of the read view. Rendered only when the field has a value. */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="text-sm text-muted-foreground sm:w-40 sm:shrink-0">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export function ProfileCard({ student }: { student: Student }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StudentProfileFormValues, unknown, StudentProfileInput>({
    resolver: standardSchemaResolver(studentProfileSchema),
    defaultValues: {
      name: student.name ?? "",
      phone: student.phone ?? "",
      gender: student.gender ?? "",
      university: student.university ?? "",
      course: student.course ?? "",
      yearOfStudy: student.yearOfStudy ?? "",
    },
  });

  // useController rather than watch(): watch() returns a new function each
  // render and cannot be memoized, which the lint rule correctly flags.
  const { field: genderField } = useController({ control, name: "gender" });

  const details: { label: string; value: string }[] = [];
  if (student.name) details.push({ label: "Full name", value: student.name });
  if (student.phone) details.push({ label: "Phone number", value: student.phone });
  if (student.university)
    details.push({ label: "University", value: student.university });
  if (student.course) details.push({ label: "Course", value: student.course });
  if (student.yearOfStudy)
    details.push({ label: "Year of study", value: `Year ${student.yearOfStudy}` });
  const gender = genderLabel(student.gender);
  if (gender) details.push({ label: "Gender", value: gender });

  const hasDetails = details.length > 0;

  async function onSubmit(values: StudentProfileInput) {
    setFormError(null);

    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        setFormError("We couldn't save your details. Please try again.");
        return;
      }

      reset(values as StudentProfileFormValues);
      setOpen(false);
      toast.success("Details saved");
      // The summary is server-rendered, so refresh to show what was just saved.
      router.refresh();
    } catch {
      setFormError(
        "We couldn't save your details. Check your connection and try again.",
      );
    }
  }

  const editor = (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant={hasDetails ? "outline" : "default"} className="gap-2">
            {hasDetails ? (
              <>
                <Pencil className="size-4" aria-hidden />
                Edit details
              </>
            ) : (
              <>
                <UserRoundPlus className="size-4" aria-hidden />
                Add your details
              </>
            )}
          </Button>
        }
      />
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Your details</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-5 px-4 pb-8"
        >
          <p className="text-sm text-muted-foreground text-pretty">
            All optional. Leave anything blank and we simply will not store it.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                {...register("name")}
                autoComplete="name"
                aria-invalid={Boolean(errors.name)}
              />
              <FieldError id="name-error" message={errors.name?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                {...register("phone")}
                autoComplete="tel"
                aria-invalid={Boolean(errors.phone)}
              />
              <FieldError id="phone-error" message={errors.phone?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="university">University</Label>
              <Input id="university" {...register("university")} />
              <FieldError
                id="university-error"
                message={errors.university?.message}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="course">Course</Label>
              <Input id="course" {...register("course")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="yearOfStudy">Year of study</Label>
              <Input
                id="yearOfStudy"
                type="number"
                min={1}
                max={8}
                {...register("yearOfStudy")}
                aria-invalid={Boolean(errors.yearOfStudy)}
              />
              <FieldError id="year-error" message={errors.yearOfStudy?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={genderField.value || UNSET}
                onValueChange={(next) =>
                  genderField.onChange(
                    next === UNSET
                      ? ""
                      : (String(next) as StudentProfileFormValues["gender"]),
                  )
                }
              >
                <SelectTrigger id="gender" className="w-full">
                  <SelectValue>
                    {genderLabel(genderField.value ?? null) ?? "Not specified"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNSET}>Not specified</SelectItem>
                  {GENDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save details"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );

  if (!hasDetails) {
    return (
      <div className="mt-4 flex flex-col items-center rounded-lg border border-dashed border-border px-6 py-10 text-center">
        <div className="rounded-full bg-muted p-3">
          <UserRoundPlus className="size-5 text-muted-foreground" aria-hidden />
        </div>
        <p className="mt-4 max-w-sm text-sm text-muted-foreground text-pretty">
          Add your details once and your enquiries arrive pre-filled, so you do
          not retype them each time. Everything here is optional.
        </p>
        <div className="mt-5">{editor}</div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-border p-5">
      <dl>
        {details.map((detail) => (
          <DetailRow key={detail.label} {...detail} />
        ))}
      </dl>
      <div className="mt-5">{editor}</div>
    </div>
  );
}
