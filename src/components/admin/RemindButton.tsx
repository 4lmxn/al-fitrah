"use client";
import { useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { markFeeReminded } from "@/app/admin/(dash)/students/fees-actions";

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
