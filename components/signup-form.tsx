"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

const RESEND_COOLDOWN_SECONDS = 30;

export function SignupForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function requestCode(event?: React.FormEvent) {
    event?.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? "Couldn't send the code. Try again.");
        return;
      }

      setStep("code");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  async function submitCode(value: string) {
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code: value }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? "That code isn't right.");
        setCode("");
        return;
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  if (step === "email") {
    return (
      <form onSubmit={requestCode} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@university.ac.uk"
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={pending || !email} className="w-full gap-2">
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Sending code…
            </>
          ) : (
            <>
              <Mail className="size-4" aria-hidden />
              Email me a code
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          No password needed. We&apos;ll email you a 6-digit code.
        </p>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => {
          setStep("email");
          setCode("");
          setError(null);
        }}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Use a different email
      </button>

      <div>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">Verification code</Label>
        <InputOTP
          id="code"
          maxLength={6}
          value={code}
          onChange={(value) => {
            setCode(value);
            setError(null);
            if (value.length === 6) submitCode(value);
          }}
          disabled={pending}
        >
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot key={index} index={index} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {pending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Verifying…
        </p>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        disabled={cooldown > 0 || pending}
        onClick={() => requestCode()}
        className="w-full"
      >
        {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
      </Button>
    </div>
  );
}
