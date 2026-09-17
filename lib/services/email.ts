import { Resend } from "resend";

/**
 * Transactional email.
 *
 * With no RESEND_API_KEY configured the code is logged to the server console
 * instead of sent, so the entire sign-in flow is testable without a provider
 * account. Adding the key later changes no application code.
 *
 * The code is NEVER logged when NODE_ENV is production — a provider outage must
 * not turn the server log into a list of valid credentials.
 */

const FROM = process.env.EMAIL_FROM ?? "AcaDomo <onboarding@resend.dev>";

export async function sendOtpEmail(
  to: string,
  code: string,
  ttlMinutes: number,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Demo mode surfaces the code in the UI instead, so no provider is needed.
    if (process.env.NEXT_PUBLIC_DEMO_OTP === "1") return;

    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not configured");
    }
    console.info(
      `\n  ┌─────────────────────────────────────────┐\n` +
        `  │  DEV OTP for ${to.padEnd(26)}│\n` +
        `  │  Code: ${code}   (expires in ${ttlMinutes}m)        │\n` +
        `  └─────────────────────────────────────────┘\n`,
    );
    return;
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `${code} is your AcaDomo sign-in code`,
    text: `Your AcaDomo sign-in code is ${code}.\n\nIt expires in ${ttlMinutes} minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:18px;margin:0 0 16px">Your AcaDomo sign-in code</h1>
        <p style="font-size:32px;font-weight:600;letter-spacing:.15em;margin:24px 0">${code}</p>
        <p style="color:#666;font-size:14px;margin:0">Expires in ${ttlMinutes} minutes.</p>
        <p style="color:#666;font-size:14px;margin:16px 0 0">If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    // Surface to the route's catch; never expose provider detail to the client.
    throw new Error(`Resend failed: ${error.message}`);
  }
}
