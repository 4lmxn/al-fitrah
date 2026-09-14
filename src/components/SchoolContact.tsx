"use client";
import { createContext, useContext } from "react";

export type SchoolContact = {
  waHref: string;
  phone: string;
};

const Ctx = createContext<SchoolContact | null>(null);

export function SchoolContactProvider({ value, children }: { value: SchoolContact; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSchoolContact(): SchoolContact {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSchoolContact must be used inside SchoolContactProvider");
  return v;
}
