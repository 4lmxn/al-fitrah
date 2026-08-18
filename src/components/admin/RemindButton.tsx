"use client";
import { useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { markFeeReminded } from "@/app/admin/(dash)/students/fees-actions";

/**
 * Opens the pre-filled WhatsApp reminder and records that it went out.
 *
 * The message itself leaves from the staff member's own phone, so the system
 * can never observe delivery. Logging the click is the only signal available,
 * and it buys the one thing that actually matters: a colleague opening this
 * page an hour later can see the family has already been contacted today and
 * does not message them a second time.
 *
 * The anchor keeps its real href, so middle-click and "open in new tab" behave
 * normally; the action fires alongside rather than instead of the navigation.
 */
export function RemindButton({ studentId, href }: { studentId: string; href: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        const fd = new FormData();
        fd.set("id", studentId);
        // Failure here must not block the reminder — the staff member is already
        // on their way to WhatsApp. Worst case the row shows no "last reminded".
        startTransition(async () => {
          await markFeeReminded(fd);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-full bg-emerald px-3.5 py-2 text-xs font-semibold text-cream transition hover:bg-emerald-dark"
    >
      <Icon name={pending ? "schedule" : "chat"} className="text-[16px]" />
      Remind
    </a>
  );
}
