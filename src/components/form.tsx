"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/types";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

/** A form wired to a Server Action that shows its error or success message. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.message && <p className="text-sm text-green-700">{state.message}</p>}
    </form>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  confirm,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  /** Asks the user to confirm before submitting. */
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={`btn btn-${variant}`}
    >
      {pending ? "Working…" : children}
    </button>
  );
}
