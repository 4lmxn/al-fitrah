#!/usr/bin/env node
/**
 * docs/proposal.md  ->  docs/proposal.html  (and optionally proposal.pdf)
 *
 * The markdown stays the single source of truth; this only renders it. The
 * renderer covers the subset the proposal actually uses — headings, tables,
 * lists, blockquotes, fenced code, rules and inline emphasis/code/links — which
 * is why there is no markdown dependency here.
 *
 * Usage:
 *   node scripts/build-proposal.mjs            # write docs/proposal.html
 *   node scripts/build-proposal.mjs docs/x.md  # write docs/x.html instead
 *   node scripts/build-proposal.mjs --pdf      # also render docs/proposal.pdf
 *   node scripts/build-proposal.mjs --selftest # assert the renderer still works
 *
 * ponytail: hand-rolled subset renderer. Swap in `marked` if the document ever
 * needs nested lists, images or inline HTML.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
// Optional first non-flag argument picks a different source document, so a
// second proposal renders through the same pipeline without a second script.
const SRC = path.resolve(ROOT, args.find((a) => !a.startsWith("--")) ?? "docs/proposal.md");
const OUT_HTML = SRC.replace(/\.md$/, ".html");
const OUT_PDF = SRC.replace(/\.md$/, ".pdf");

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** GitHub-compatible heading slug, so the table of contents keeps working. */
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .trim()
    .replace(/ /g, "-");

/** Inline formatting. Order matters: code first, so its contents stay literal. */
function inline(text) {
  const code = [];
  let out = escapeHtml(text).replace(/`([^`]+)`/g, (_, c) => {
    code.push(c);
    return `\u0000${code.length - 1}\u0000`;
  });
  out = out
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${code[i]}</code>`);
}

const cells = (row) =>
  row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

export function render(md) {
  const lines = md.split("\n");
  const html = [];
  let i = 0;

  const flushList = (tag, items) =>
    html.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</${tag}>`);

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    // fenced code
    if (line.startsWith("```")) {
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;
      html.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // horizontal rule
    if (/^---+$/.test(line.trim())) { html.push("<hr>"); i++; continue; }

    // heading
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      html.push(`<h${level} id="${slug(text)}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    // table
    if (line.trim().startsWith("|") && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? "")) {
      const head = cells(line);
      i += 2;
      const body = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) body.push(cells(lines[i++]));
      // A header row of empty cells is how markdown writes a headerless table
      // (the document-control block on the cover). Rendering it produces a
      // blank grey band, so drop the thead entirely in that case.
      const thead = head.some((c) => c)
        ? `<thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead>`
        : "";
      html.push(
        `<table>${thead}` +
          `<tbody>${body
            .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`,
      );
      continue;
    }

    // blockquote
    if (line.startsWith(">")) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith(">")) buf.push(lines[i++].replace(/^>\s?/, ""));
      html.push(`<blockquote>${render(buf.join("\n"))}</blockquote>`);
      continue;
    }

    // list — continuation lines are indented, so they fold into the item above
    const bullet = line.match(/^([-*]|\d+\.)\s+(.*)$/);
    if (bullet) {
      const tag = /^\d/.test(bullet[1]) ? "ol" : "ul";
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(/^([-*]|\d+\.)\s+(.*)$/);
        if (m && (/^\d/.test(m[1]) ? "ol" : "ul") === tag) { items.push(m[2]); i++; continue; }
        if (/^\s+\S/.test(lines[i]) && items.length) { items[items.length - 1] += " " + lines[i].trim(); i++; continue; }
        break;
      }
      flushList(tag, items);
      continue;
    }

    // paragraph
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|>|\||---+$)/.test(lines[i]) && !/^([-*]|\d+\.)\s/.test(lines[i])) {
      buf.push(lines[i++]);
    }
    html.push(`<p>${inline(buf.join(" "))}</p>`);
  }

  return html.join("\n");
}

const CSS = `
:root { --ink:#14181f; --muted:#5a6472; --line:#d9dee6; --accent:#1f4e46; --bg:#fff; }
* { box-sizing:border-box; }
body { margin:0; padding:48px 56px 72px; background:#f3f4f6; color:var(--ink);
  font:16px/1.65 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif; }
main { max-width:820px; margin:0 auto; background:var(--bg); padding:64px 72px;
  box-shadow:0 1px 3px rgba(0,0,0,.12); }
h1,h2,h3,h4 { font-family:"Helvetica Neue",Arial,sans-serif; line-height:1.25; color:var(--ink); }
h1 { font-size:26px; margin:2.4em 0 .8em; padding-bottom:.35em; border-bottom:2px solid var(--accent);
  letter-spacing:-.01em; }
main > h1:first-of-type { margin-top:0; }
h2 { font-size:20px; margin:2em 0 .6em; }
h3 { font-size:16px; margin:1.7em 0 .5em; letter-spacing:.01em; }
h4 { font-size:14px; margin:1.4em 0 .4em; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
p { margin:0 0 1em; }
ul,ol { margin:0 0 1em; padding-left:1.9em; }
li { margin:.3em 0; }
a { color:var(--accent); }
strong { font-weight:700; }
code { font-family:ui-monospace,"SF Mono",Menlo,monospace; font-size:.87em;
  background:#f1f3f5; padding:.12em .35em; border-radius:3px; }
pre { background:#f7f8fa; border:1px solid var(--line); border-radius:4px; padding:14px 16px;
  overflow-x:auto; font-size:12px; line-height:1.45; }
pre code { background:none; padding:0; font-size:inherit; }
blockquote { margin:1.2em 0; padding:.8em 1.1em; border-left:3px solid var(--accent);
  background:#f6f9f8; color:var(--ink); }
blockquote p:last-child { margin-bottom:0; }
hr { border:0; border-top:1px solid var(--line); margin:2.2em 0; }
table { width:100%; border-collapse:collapse; margin:1.2em 0; font-size:13.5px;
  font-family:"Helvetica Neue",Arial,sans-serif; }
th,td { border:1px solid var(--line); padding:7px 10px; text-align:left; vertical-align:top; }
th { background:#f1f4f3; font-weight:600; }
tbody tr:nth-child(even) { background:#fafbfc; }
tbody tr:last-child td { font-weight:inherit; }

@media print {
  @page { size:A4; margin:18mm 16mm 20mm; }
  body { padding:0; background:#fff; font-size:10.5pt; }
  main { max-width:none; padding:0; box-shadow:none; }
  h1 { page-break-before:always; page-break-after:avoid; font-size:16pt; }
  main > h1:first-of-type { page-break-before:avoid; }
  /* Cover page stands alone; the contents list starts the next one. */
  #table-of-contents { page-break-before:always; }
  h2,h3,h4 { page-break-after:avoid; }
  /* Long tables split across pages rather than being pushed whole onto the
     next one and leaving half a page blank; rows stay intact and the header
     repeats on each continuation. */
  pre,blockquote { page-break-inside:avoid; }
  tr { page-break-inside:avoid; }
  thead { display:table-header-group; }
  a { color:var(--ink); text-decoration:none; }
  hr { display:none; }
}
`;

function page(body, title) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${CSS}</style>
</head><body><main>${body}</main></body></html>`;
}

async function toPdf(htmlPath) {
  const { chromium } = await import("playwright");
  // Prefer the locally installed Chrome so nothing has to be downloaded; fall
  // back to Playwright's own build if it happens to be present.
  const browser = await chromium
    .launch({ channel: "chrome" })
    .catch(() => chromium.launch());
  const p = await browser.newPage();
  await p.goto("file://" + htmlPath, { waitUntil: "load" });
  await p.pdf({
    path: OUT_PDF,
    format: "A4",
    printBackground: true,
    margin: { top: "18mm", bottom: "20mm", left: "16mm", right: "16mm" },
    displayHeaderFooter: true,
    headerTemplate: `<div style="font:8pt Helvetica;color:#8a929c;width:100%;padding:0 16mm;">
      Al Fitrah Pre School, Sarjapura — School Management Platform · Technical Proposal</div>`,
    footerTemplate: `<div style="font:8pt Helvetica;color:#8a929c;width:100%;padding:0 16mm;
      display:flex;justify-content:space-between;">
      <span>DVLN Solutions LLP · Confidential</span>
      <span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
  });
  await browser.close();
}

function selftest() {
  assert.equal(slug("11. Assumptions, Dependencies & Acceptance"), "11-assumptions-dependencies--acceptance");
  assert.match(render("# Scope & Objectives"), /<h1 id="scope--objectives">/);
  assert.equal(render("**a** and `b*c`"), "<p><strong>a</strong> and <code>b*c</code></p>");
  assert.match(render("| A | B |\n|---|---|\n| 1 | 2 |"), /<table>.*<th>A<\/th>.*<td>2<\/td>.*<\/table>/s);
  assert.equal(render("| | |\n|---|---|\n| a | b |").includes("<thead>"), false);
  assert.equal(render("- one\n  wrapped\n- two"), "<ul><li>one wrapped</li><li>two</li></ul>");
  assert.match(render("> note\n> more"), /<blockquote><p>note more<\/p><\/blockquote>/);
  assert.match(render("```\nx <y>\n```"), /<pre><code>x &lt;y&gt;<\/code><\/pre>/);
  console.log("selftest ok");
}

if (args.includes("--selftest")) {
  selftest();
} else {
  const md = await readFile(SRC, "utf8");
  const title = (md.match(/^#\s+(.*)$/m)?.[1] ?? "Proposal") + " — Al Fitrah Pre School, Sarjapura";
  await writeFile(OUT_HTML, page(render(md), title));
  console.log("wrote", path.relative(ROOT, OUT_HTML));
  if (args.includes("--pdf")) {
    try {
      await toPdf(OUT_HTML);
      console.log("wrote", path.relative(ROOT, OUT_PDF));
    } catch (err) {
      console.error("PDF render failed:", err.message.split("\n")[0]);
      console.error("Open " + path.relative(ROOT, OUT_HTML) + " and print to PDF (Cmd+P), or run: npx playwright install chromium");
      process.exitCode = 1;
    }
  }
}
