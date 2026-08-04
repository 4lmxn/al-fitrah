"use client";
import { useActionState } from "react";
import type { ReactNode } from "react";
import type { ActionResult } from "@/lib/actionResult";
import { Icon } from "@/components/ui/Icon";

/**
 * A form whose server action reports failure by returning rather than throwing.
 *
 * Exists so every admin form shows its own errors in place. Previously an action
 * that threw took the whole page to the error boundary with an opaque digest —
 * an admin logging a call would lose the screen and be told nothing. Here the
 * message lands under the form that caused it and the inputs stay filled.
 */
export function ActionForm({
  action,
  children,
  className,
  errorClassName,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  errorClassName?: string;
}) {
  const [state, formAction] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) => action(formData),
    null,
  );

  return (
    <form action={formAction} className={className}>
      {children}
      {state && !state.ok && (
        <p
          role="alert"
          className={
            errorClassName ??
            "mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          }
        >
          <Icon name="error" className="mt-0.5 shrink-0 text-[16px]" />
          {state.error}
        </p>
      )}
    </form>
  );
}
