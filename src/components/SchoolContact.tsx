"use client";
import { createContext, useContext } from "react";

/**
 * The school's contact details, for client components.
 *
 * These are configuration, which is server-only and async. Threading them as
 * props reached four levels deep (page → CTA → CaptureForm → error fallback),
 * where every intermediate component had to carry values it did not use.
 * One provider at the layout keeps the resolution server-side and the drilling
 * out of components that are not about contact details.
 */
export type SchoolContact = {
  /** wa.me link with the enquiry text already encoded, ready to append context. */
  waHref: string;
  phone: string;
};

const Ctx = createContext<SchoolContact | null>(null);

export function SchoolContactProvider({ value, children }: { value: SchoolContact; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSchoolContact(): SchoolContact {
  const v = useContext(Ctx);
  // A missing provider would silently render a dead "call us" link on the exact
  // screen a parent reaches when something else already failed.
  if (!v) throw new Error("useSchoolContact must be used inside SchoolContactProvider");
  return v;
}
