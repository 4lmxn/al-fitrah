"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

// Copy-to-clipboard button used for the referral link on lead detail.
export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (insecure context) — select-and-copy is the fallback.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald px-3 py-2 text-xs font-semibold text-cream transition hover:bg-emerald-deep"
    >
      <Icon name={copied ? "check" : "content_copy"} className="text-[16px]" />
      {copied ? "Copied" : label}
    </button>
  );
}
