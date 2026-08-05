import { describe, expect, it } from "vitest";
import { splitCsvLine, parseDob, parseStudentCsv } from "@/lib/studentImport";

// Lists are configuration; the parser is given them the way the action does.
const LISTS = { programs: ["Pre-KG", "Junior KG", "Senior KG"], classSections: ["Rose", "Tulip", "Jasmine"] };

describe("splitCsvLine", () => {
  it("keeps a comma inside a quoted field", () => {
    // "Khan, Ayesha" is the normal way a school spreadsheet stores a name.
    expect(splitCsvLine('AF-1,"Khan, Ayesha",9876543210')).toEqual(["AF-1", "Khan, Ayesha", "9876543210"]);
  });

  it("unescapes doubled quotes", () => {
    expect(splitCsvLine('a,"say ""hi""",b')).toEqual(["a", 'say "hi"', "b"]);
  });

  it("preserves empty trailing fields", () => {
    expect(splitCsvLine("a,,c,")).toEqual(["a", "", "c", ""]);
  });
});

describe("parseDob", () => {
  it("reads DD/MM/YYYY day-first, as Indian spreadsheets write it", () => {
    // 03/08/2022 is 3 August. Month-first would file the child in the wrong intake.
    expect(parseDob("03/08/2022")).toBe("2022-08-03");
    expect(parseDob("3/8/2022")).toBe("2022-08-03");
  });

  it("accepts ISO unchanged", () => {
    expect(parseDob("2022-11-14")).toBe("2022-11-14");
  });

  it("treats blank as absent, not invalid", () => {
    expect(parseDob("")).toBeNull();
  });

  it("rejects a date that doesn't exist rather than rolling it over", () => {
    // new Date(2022,1,31) silently becomes 3 March; that must not pass.
    expect(parseDob("31/02/2022")).toBeUndefined();
    expect(parseDob("2022-13-01")).toBeUndefined();
    expect(parseDob("not a date")).toBeUndefined();
  });
});

describe("parseStudentCsv", () => {
  const header = "firstName,lastName,guardianName,guardianPhone";

  it("refuses a file with no header", () => {
    const r = parseStudentCsv2("Yusuf,Khan,Ayesha,9876543210");
    expect(r.rows).toHaveLength(0);
    expect(r.errors[0].message).toMatch(/Missing required column/);
  });

  it("parses a valid row", () => {
    const r = parseStudentCsv2(`${header}\nYusuf,Khan,Ayesha Khan,9876543210`);
    expect(r.errors).toEqual([]);
    expect(r.rows[0]).toMatchObject({ firstName: "Yusuf", guardianName: "Ayesha Khan", program: "Pre-KG", status: "enrolled" });
  });

  it("reports the spreadsheet row number, not an array index", () => {
    // Row 1 is the header, so the first data row is row 2 — that is what the
    // person fixing the file sees in Excel.
    const r = parseStudentCsv2(`${header}\nYusuf,Khan,Ayesha,9876543210\n,Ahmed,Bilal,9876543211`);
    expect(r.errors[0].rowNumber).toBe(3);
  });

  it("rejects an unknown class rather than inventing one", () => {
    const r = parseStudentCsv2(`${header},classSection\nYusuf,Khan,Ayesha,9876543210,Daffodil`);
    expect(r.rows).toHaveLength(0);
    expect(r.errors[0].message).toMatch(/not one of/);
  });

  it("catches a duplicate admission number inside the file", () => {
    const csv = `admissionNumber,${header}\nAF-1,Yusuf,Khan,Ayesha,9876543210\nAF-1,Maryam,Ahmed,Bilal,9876543211`;
    const r = parseStudentCsv2(csv);
    expect(r.errors[0].message).toMatch(/appears more than once/);
  });

  it("converts fees to paise and tolerates formatting", () => {
    const r = parseStudentCsv2(`${header},feeTotal\nYusuf,Khan,Ayesha,9876543210,"25,000.50"`);
    expect(r.rows[0].feeTotalPaise).toBe(2_500_050);
  });

  it("flags unknown columns instead of silently dropping them", () => {
    const r = parseStudentCsv2(`${header},bloodGroup\nYusuf,Khan,Ayesha,9876543210,O+`);
    expect(r.unknownColumns).toContain("bloodgroup");
    expect(r.rows).toHaveLength(1);
  });

  it("matches headers regardless of case and spacing", () => {
    const r = parseStudentCsv2("First Name,Guardian_Name,GUARDIANPHONE\nYusuf,Ayesha,9876543210");
    expect(r.errors).toEqual([]);
    expect(r.rows[0].firstName).toBe("Yusuf");
  });
});

function parseStudentCsv2(text: string) {
  return parseStudentCsv(text, LISTS);
}
