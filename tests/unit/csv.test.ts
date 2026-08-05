import { describe, expect, it } from "vitest";
import { csvField, csvRow, csvDocument, csvFilename } from "@/lib/csv";
import { splitCsvLine } from "@/lib/studentImport";

describe("csvField", () => {
  it("leaves an ordinary value alone", () => {
    expect(csvField("Ayesha")).toBe("Ayesha");
  });

  it("quotes a value containing a comma", () => {
    expect(csvField("Khan, Ayesha")).toBe('"Khan, Ayesha"');
  });

  it("doubles internal quotes", () => {
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
  });

  it("quotes newlines so a message cannot break the row structure", () => {
    expect(csvField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("renders null and undefined as empty", () => {
    expect(csvField(null)).toBe("");
    expect(csvField(undefined)).toBe("");
  });
});

describe("CSV injection", () => {
  // Excel and Sheets evaluate cells starting with = + - @ as formulas. These
  // values arrive through a public form, so they are attacker-controlled.
  it("neutralises a formula that would run in a spreadsheet", () => {
    expect(csvField('=HYPERLINK("http://evil","Click")')).toBe(`"'=HYPERLINK(""http://evil"",""Click"")"`);
  });

  it("guards every formula trigger, not just equals", () => {
    for (const c of ["=", "+", "-", "@"]) {
      expect(csvField(`${c}cmd`).startsWith("'")).toBe(true);
    }
  });

  it("does not mangle an ordinary phone number", () => {
    // A leading + is a formula trigger, so the guard fires — but the number
    // must survive intact for the school to be able to dial it.
    const out = csvField("+919876543210");
    expect(out).toBe("'+919876543210");
    expect(out).toContain("919876543210");
  });
});

describe("round trip", () => {
  it("survives being read back by our own parser", () => {
    const values = ["Khan, Ayesha", 'say "hi"', "plain", ""];
    expect(splitCsvLine(csvRow(values))).toEqual(values);
  });
});

describe("csvDocument", () => {
  it("starts with a BOM so Excel does not mangle non-ASCII names", () => {
    expect(csvDocument(["a"], [["x"]]).charCodeAt(0)).toBe(0xfeff);
  });

  it("uses CRLF line endings, which is what spreadsheets expect", () => {
    expect(csvDocument(["a", "b"], [["1", "2"]])).toContain("a,b\r\n1,2\r\n");
  });
});

describe("csvFilename", () => {
  it("stamps the date, zero-padded", () => {
    expect(csvFilename("leads", new Date(2026, 7, 5))).toBe("leads-2026-08-05.csv");
  });
});
