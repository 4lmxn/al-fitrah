"use client";
import { useActionState } from "react";
import type { ReactNode } from "react";
import type { ActionResult } from "@/lib/actionResult";
import { Icon } from "@/components/ui/Icon";

export function ActionForm({
  action,
  children,
  className,
  errorClassName,
  id,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  errorClassName?: string;
  id?: string;
}) {
  const [state, formAction] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) => action(formData),
    null,
  );

  return (
    <form id={id} action={formAction} className={className}>
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
