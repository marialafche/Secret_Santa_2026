"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/form";
import { Hero } from "@/components/hero";
import { authenticate } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  // Controlled so the email survives a failed attempt (React resets forms after actions).
  const [email, setEmail] = useState("");
  const signingIn = mode === "signin";

  return (
    <div className="mx-auto max-w-lg py-4 sm:py-10">
      {signingIn ? (
        <Hero badge="Secret Santa Utaiki · welcome back" title="Ho ho ho," highlight="hello again!">
          Sign in to see who you&apos;re shopping for, peek at their wishlist and send them a
          sneaky question. 🎁
        </Hero>
      ) : (
        <Hero badge="Secret Santa Utaiki · sign-ups open" title="Ho ho ho —" highlight="you in?">
          Create an account to join this year&apos;s Secret Santa. When the draw opens, come back
          here and pull a name from the hat. 🎩
        </Hero>
      )}

      <div className="card space-y-5">
        <ActionForm action={authenticate} className="space-y-4">
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="label">
              Password{" "}
              {!signingIn && <span className="font-normal">(pick any, 6+ characters)</span>}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={signingIn ? "current-password" : "new-password"}
              className="input"
            />
          </div>
          <div className="[&>button]:w-full [&>button]:py-3.5 [&>button]:text-base">
            <SubmitButton>{signingIn ? "Sign in 🎄" : "I'm in! 🎄"}</SubmitButton>
          </div>
        </ActionForm>

        <p className="text-center text-sm text-muted">
          {signingIn ? "New here? " : "Already have an account? "}
          <button
            type="button"
            className="link cursor-pointer font-semibold text-foreground"
            onClick={() => setMode(signingIn ? "signup" : "signin")}
          >
            {signingIn ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
