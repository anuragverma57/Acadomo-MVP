"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Property } from "@/lib/db/queries";
import { roomTypeLabel } from "@/lib/format";
import {
  ROOM_TYPES,
  propertyInputSchema,
  type PropertyFormValues,
  type PropertyInputValues,
} from "@/lib/validation";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

export function PropertyForm({ property }: { property?: Property }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const editing = Boolean(property);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormValues, unknown, PropertyInputValues>({
    // Same schema the API validates with.
    resolver: standardSchemaResolver(propertyInputSchema),
    defaultValues: property
      ? {
          title: property.title,
          city: property.city,
          country: property.country,
          university: property.university,
          pricePerWeek: property.pricePerWeek,
          roomType: property.roomType,
          description: property.description,
          amenities: property.amenities,
          imageUrl: property.imageUrl,
          isActive: property.isActive,
        }
      : {
          title: "",
          city: "",
          country: "United Kingdom",
          university: "",
          pricePerWeek: 20000,
          roomType: "studio",
          description: "",
          amenities: [],
          imageUrl: "",
          isActive: true,
        },
  });

  // useWatch rather than watch(): it subscribes through the control object, so
  // the React Compiler can still optimize this component.
  const roomType = useWatch({ control, name: "roomType" });
  const isActive = useWatch({ control, name: "isActive" });
  const amenities = useWatch({ control, name: "amenities" });

  async function onSubmit(values: PropertyInputValues) {
    setFormError(null);

    try {
      const response = await fetch(
        editing ? `/api/admin/properties/${property!.id}` : "/api/admin/properties",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setFormError(data?.error ?? "Couldn't save. Please try again.");
        return;
      }

      toast.success(editing ? "Property updated" : "Property created");
      router.push("/admin/properties");
      router.refresh();
    } catch {
      setFormError("Couldn't reach the server. Check your connection.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register("title")} aria-invalid={Boolean(errors.title)} />
        <FieldError message={errors.title?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" {...register("city")} aria-invalid={Boolean(errors.city)} />
          <FieldError message={errors.city?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="country">Country</Label>
          <Input id="country" {...register("country")} aria-invalid={Boolean(errors.country)} />
          <FieldError message={errors.country?.message} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="university">University</Label>
        <Input id="university" {...register("university")} aria-invalid={Boolean(errors.university)} />
        <FieldError message={errors.university?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pricePerWeek">Price per week (pence)</Label>
          <Input
            id="pricePerWeek"
            type="number"
            inputMode="numeric"
            {...register("pricePerWeek")}
            aria-invalid={Boolean(errors.pricePerWeek)}
          />
          <p className="text-xs text-muted-foreground">
            Stored as whole pence — 20000 is £200.00
          </p>
          <FieldError message={errors.pricePerWeek?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="roomType">Room type</Label>
          <Select
            value={roomType}
            onValueChange={(value) =>
              setValue("roomType", value as PropertyInputValues["roomType"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="roomType" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROOM_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {roomTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="imageUrl">Image URL</Label>
        <Input
          id="imageUrl"
          placeholder="https://images.unsplash.com/..."
          {...register("imageUrl")}
          aria-invalid={Boolean(errors.imageUrl)}
        />
        <p className="text-xs text-muted-foreground">
          Must be an images.unsplash.com URL — the only host allowed by next/image.
        </p>
        <FieldError message={errors.imageUrl?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amenities">Amenities</Label>
        <Input
          id="amenities"
          defaultValue={amenities?.join(", ")}
          placeholder="En-suite bathroom, Wi-Fi, Bills included"
          onChange={(event) =>
            setValue(
              "amenities",
              event.target.value
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
              { shouldValidate: true },
            )
          }
        />
        <p className="text-xs text-muted-foreground">Comma separated</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={5}
          {...register("description")}
          aria-invalid={Boolean(errors.description)}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <p className="text-sm font-medium">Visible to students</p>
          <p className="text-sm text-muted-foreground">
            Turn off to hide this listing without deleting it.
          </p>
        </div>
        <Switch
          checked={isActive}
          onCheckedChange={(checked) =>
            setValue("isActive", Boolean(checked), { shouldValidate: true })
          }
          aria-label="Visible to students"
        />
      </div>

      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {editing ? "Save changes" : "Create property"}
        </Button>
        <Button
          render={<Link href="/admin/properties" />}
          variant="ghost"
          size="lg"
          type="button"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
