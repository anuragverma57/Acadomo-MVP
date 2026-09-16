import { describe, expect, it } from "vitest";

import {
  adminLoginSchema,
  enquiryInputSchema,
  propertyFiltersSchema,
  safeRedirect,
  verifyOtpSchema,
} from "@/lib/validation";

const validEnquiry = {
  propertyId: 1,
  name: "Priya Sharma",
  email: "priya@example.com",
  phone: "+44 7700 900123",
  message: "Is this available from September for a 12-month let?",
};

describe("enquiryInputSchema", () => {
  it("accepts a well-formed enquiry", () => {
    expect(enquiryInputSchema.safeParse(validEnquiry).success).toBe(true);
  });

  it("normalizes email to lowercase and trims whitespace", () => {
    const parsed = enquiryInputSchema.parse({
      ...validEnquiry,
      email: "  Priya.Sharma@Example.COM  ",
      name: "  Priya Sharma  ",
    });

    expect(parsed.email).toBe("priya.sharma@example.com");
    expect(parsed.name).toBe("Priya Sharma");
  });

  it.each([
    ["missing @", "not-an-email"],
    ["missing domain", "priya@"],
    ["leading space only", "   "],
  ])("rejects an invalid email (%s)", (_label, email) => {
    expect(enquiryInputSchema.safeParse({ ...validEnquiry, email }).success).toBe(
      false,
    );
  });

  it("rejects a name that is too short", () => {
    expect(
      enquiryInputSchema.safeParse({ ...validEnquiry, name: "A" }).success,
    ).toBe(false);
  });

  it("rejects a message under 10 characters", () => {
    expect(
      enquiryInputSchema.safeParse({ ...validEnquiry, message: "hi" }).success,
    ).toBe(false);
  });

  it("rejects a message over 2000 characters", () => {
    expect(
      enquiryInputSchema.safeParse({
        ...validEnquiry,
        message: "x".repeat(2001),
      }).success,
    ).toBe(false);
  });

  it.each(["xyz", "12345", "+44 (0) 7700 900123 ext"])(
    "rejects malformed phone %s",
    (phone) => {
      expect(
        enquiryInputSchema.safeParse({ ...validEnquiry, phone }).success,
      ).toBe(false);
    },
  );

  it.each(["+447700900123", "07700 900123", "+44 (0)7700-900123"])(
    "accepts international phone format %s",
    (phone) => {
      expect(
        enquiryInputSchema.safeParse({ ...validEnquiry, phone }).success,
      ).toBe(true);
    },
  );

  it("accepts the honeypot field rather than rejecting it", () => {
    // Rejecting here would tell a bot which field caught it. The service
    // silently discards instead — see lib/services/enquiries.ts.
    const parsed = enquiryInputSchema.safeParse({
      ...validEnquiry,
      company: "SpamCorp",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.company).toBe("SpamCorp");
  });
});

describe("propertyFiltersSchema", () => {
  it("applies defaults when nothing is supplied", () => {
    const parsed = propertyFiltersSchema.parse({});
    expect(parsed).toMatchObject({ sort: "newest", page: 1, pageSize: 12 });
  });

  it("coerces numeric query strings", () => {
    const parsed = propertyFiltersSchema.parse({
      minPrice: "15000",
      maxPrice: "30000",
      page: "2",
    });

    expect(parsed.minPrice).toBe(15000);
    expect(parsed.maxPrice).toBe(30000);
    expect(parsed.page).toBe(2);
  });

  it("treats empty strings as absent", () => {
    const parsed = propertyFiltersSchema.parse({ city: "", university: "" });
    expect(parsed.city).toBeUndefined();
    expect(parsed.university).toBeUndefined();
  });

  it("rejects a reversed price range", () => {
    const result = propertyFiltersSchema.safeParse({
      minPrice: "50000",
      maxPrice: "10000",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a pageSize above the cap", () => {
    expect(propertyFiltersSchema.safeParse({ pageSize: "9999" }).success).toBe(
      false,
    );
  });

  it("rejects an unknown room type", () => {
    expect(
      propertyFiltersSchema.safeParse({ roomType: "penthouse" }).success,
    ).toBe(false);
  });

  it("rejects a sort key outside the allowlist", () => {
    // ORDER BY cannot be parameterized, so an unknown key must never reach SQL.
    expect(
      propertyFiltersSchema.safeParse({ sort: "id; DROP TABLE properties" })
        .success,
    ).toBe(false);
  });
});

describe("verifyOtpSchema", () => {
  it("accepts exactly six digits", () => {
    expect(
      verifyOtpSchema.safeParse({ email: "a@b.com", code: "012345" }).success,
    ).toBe(true);
  });

  it.each(["12345", "1234567", "abcdef", "12 34 56", ""])(
    "rejects malformed code %s",
    (code) => {
      expect(verifyOtpSchema.safeParse({ email: "a@b.com", code }).success).toBe(
        false,
      );
    },
  );
});

describe("adminLoginSchema", () => {
  it("accepts valid credentials", () => {
    expect(
      adminLoginSchema.safeParse({ email: "a@b.com", password: "secret" })
        .success,
    ).toBe(true);
  });

  it("rejects an empty password", () => {
    expect(
      adminLoginSchema.safeParse({ email: "a@b.com", password: "" }).success,
    ).toBe(false);
  });
});

describe("safeRedirect", () => {
  it.each([
    ["absolute external URL", "https://evil.com"],
    ["protocol-relative URL", "//evil.com"],
    ["backslash trick", "/\\evil.com"],
    ["javascript scheme", "javascript:alert(1)"],
    ["non-string", 42],
    ["undefined", undefined],
  ])("falls back to / for %s", (_label, value) => {
    expect(safeRedirect(value)).toBe("/");
  });

  it.each(["/saved", "/account", "/properties/some-slug?a=1"])(
    "allows same-site path %s",
    (path) => {
      expect(safeRedirect(path)).toBe(path);
    },
  );
});
