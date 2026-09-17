"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mail, ShieldCheck, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { useOnline } from "@/hooks/use-online";

const RESEND_COOLDOWN_SECONDS = 30;

type Step = "email" | "code" | "password";

export function SignupForm({ next }: { next: string }) {
  const router = useRouter();
  const online = useOnline();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  /** Demo mode only — shows the code so the flow works without an email provider. */
  function showDemoCode(demoCode?: string) {
    if (!demoCode) return;
    toast.info(`Demo mode — your code is ${demoCode}`, {
      description: "Email delivery isn't configured, so the code is shown here.",
      duration: 5000,
    });
  }

  async function post(url: string, body: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    return { response, data };
  }

  /** Step 1: decide whether this address signs in with a password or a code. */
  async function identify(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const { response, data } = await post("/api/auth/identify", { email });

      if (!response.ok) {
        setError(data?.error ?? "Couldn't continue. Try again.");
        return;
      }

      if (data.method === "password") {
        setStep("password");
        return;
      }

      const sent = await post("/api/auth/request-otp", { email });
      if (!sent.response.ok) {
        setError(sent.data?.error ?? "Couldn't send the code. Try again.");
        return;
      }

      showDemoCode(sent.data?.demoCode);
      setStep("code");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  async function resendCode() {
    setError(null);
    setPending(true);
    try {
      const { response, data } = await post("/api/auth/request-otp", { email });
      if (!response.ok) {
        setError(data?.error ?? "Couldn't resend the code.");
        return;
      }
      showDemoCode(data?.demoCode);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setPending(false);
    }
  }

  async function submitCode(value: string) {
    setError(null);
    setPending(true);

    try {
      const { response, data } = await post("/api/auth/verify-otp", {
        email,
        code: value,
      });

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

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const { response, data } = await post("/api/admin/login", {
        email,
        password,
      });

      if (!response.ok) {
        setError(data?.error ?? "Incorrect email or password");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  function back() {
    setStep("email");
    setCode("");
    setPassword("");
    setError(null);
  }

  const offlineNotice = !online ? (
    <p
      role="status"
      className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      You&apos;re offline — reconnect to sign in.
    </p>
  ) : null;

  const errorNotice = error ? (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  ) : null;

  const backButton = (
    <button
      type="button"
      onClick={back}
      className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Use a different email
    </button>
  );

  // ---- Step 1: email -------------------------------------------------------
  if (step === "email") {
    return (
      <form onSubmit={identify} noValidate className="space-y-4">
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

        {errorNotice}
        {offlineNotice}

        <Button
          type="submit"
          size="lg"
          disabled={pending || !email || !online}
          className="w-full gap-2"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Continuing…
            </>
          ) : (
            <>
              <Mail className="size-4" aria-hidden />
              Continue
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Students sign in with a one-time code — no password needed.
        </p>
      </form>
    );
  }

  // ---- Step 2a: staff password --------------------------------------------
  if (step === "password") {
    return (
      <form onSubmit={submitPassword} noValidate className="space-y-5">
        {backButton}

        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0" aria-hidden />
          Staff account — enter your password
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {errorNotice}
        {offlineNotice}

        <Button
          type="submit"
          size="lg"
          disabled={pending || !password || !online}
          className="w-full"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    );
  }

  // ---- Step 2b: student one-time code -------------------------------------
  return (
    <div className="space-y-5">
      {backButton}

      <p className="text-sm text-muted-foreground">
        We sent a 6-digit code to{" "}
        <span className="font-medium text-foreground">{email}</span>
      </p>

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

      {errorNotice}
      {offlineNotice}

      {pending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Verifying…
        </p>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        disabled={cooldown > 0 || pending || !online}
        onClick={resendCode}
        className="w-full"
      >
        {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
      </Button>
    </div>
  );
}
