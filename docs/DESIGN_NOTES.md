# Design notes

Why the code is the way it is.

These notes were extracted from the source on 14 Sep 2026, when the comments
were stripped out of `src/`. Each section is one file; each block is the
reasoning that sat above a declaration in it. Nothing here is generated from
the code, so nothing here updates itself — when you change a decision recorded
below, change the note with it or delete it.

Read `docs/HANDOVER.md` first for what the system is; this is the layer
underneath, for when you are about to change something and want to know what it
was protecting against.

---

## `src/app/admin/(dash)/attendance/actions.ts`

**`async function fence(`**

The campus fence, applied.

One gate for both staff check-in and the class register, so the two can never
drift apart on what "at school" means. A refusal is written to the audit log
with the coordinates that caused it — the attempt is the thing worth keeping,
and a register that only records successes cannot show the office that
someone tried to mark in from home.

**`export async function checkIn(formData: FormData): Promise<ActionResult>`**

Record the signed-in staff member as present at the campus, today.

The date and the time are the server's. The client supplies only a position,
and gets judged on it — see lib/geofence for what that does and does not
defend against.

First check-in of the day wins. A second tap is reported back rather than
overwriting, so an 8 a.m. arrival is not quietly replaced by a 3 p.m. one.

**`export async function saveRegister(formData: FormData): Promise<ActionResult>`**

Save a class register for one day.

The whole register submits at once, as one write to one document. The
alternative — a write per child as each toggle is tapped — would be twenty
writes per class per day and would still need this endpoint for correctness.

ponytail: last submit wins for the whole day. Two teachers marking the same
class simultaneously would overwrite each other. Per-student field paths
(`entries.${id}`) would fix it; not worth the complexity while one teacher
owns a class, and the timestamp records who wrote last either way.

---

## `src/app/admin/(dash)/fees/page.tsx`

**`const bucketStyle: Record<FeeBucket, { chip: string; icon: string }> =`**

Who to ring this morning.

The previous version of this page listed every enrolled child with a balance,
sorted by nothing in particular. That is a report, not a worklist: it gives
the office one possible action — message everybody who owes anything — which
is exactly the blast that trains parents to ignore school fee messages.

So the same rows are bucketed by lib/feeStatus and the buckets are ordered by
how recoverable the money is. A broken promise sits at the top because the
parent named that date themselves, which makes it both the easiest call to
make and the one most likely to be paid.

The read cost is unchanged: still one page of enrolled students, filtered in
memory. Bucketing is arithmetic on data already fetched.

ponytail: this pages through enrolled students and buckets the page, so the
totals are honest about covering one page only. If the school ever wants
"every overdue family, school-wide", store dueDate and balancePaise as
queryable fields and index them. Not worth the extra write until asked.

---

## `src/app/admin/(dash)/fees/structures/actions.ts`

**`export async function updateStructure(formData: FormData): Promise<ActionResult>`**

Edit a structure.

This changes the price list, not what any family already owes — assigned
totals are copies (see lib/feeStructures). Re-applying to a class is a
separate, deliberate action, which is what keeps a correction to next year's
Nursery fee from silently restating this year's invoices.

**`export async function applyToClass(formData: FormData): Promise<ActionResult>`**

Put a whole class on a fee.

The reason structures exist: typing the same ₹25,000 onto forty records is
forty chances to type ₹2,500 instead.

Three cases, and the split is the point:

 - no total set yet          → apply
 - already on THIS fee       → re-apply, keeping the child's own concession,
                               so a corrected amount reaches them
 - on a different amount     → skip

The last one is what stops a bulk action from quietly overwriting a fee a
family negotiated. Bounded by the class roster (MAX_CLASS_SIZE), so the write
count is capped by the size of a preschool class.

---

## `src/app/admin/(dash)/fees/structures/page.tsx`

**`export default async function FeeStructuresPage()`**

The school's price list.

Editing a fee here changes what will be charged next, never what a family has
already been told they owe — assigned totals are copies. "Apply to a class"
is the deliberate step that pushes a change onto records, and it skips any
child whose fee was set to something else on purpose.

---

## `src/app/admin/(dash)/leads/[id]/actions.ts`

**`export async function assignLead(formData: FormData): Promise<ActionResult>`**

Assign a lead to a member of staff, or clear the assignment.

Restricted to the admin allowlist: assigning work to an address that cannot
sign in produces a lead nobody owns while looking like one somebody does.

**`export async function setTags(formData: FormData): Promise<ActionResult>`**

Replace a lead's tags.

Values are checked against the configured vocabulary. Free-text tags were the
alternative, and they rot the same way free-text class sections did:
"Sibling", "sibling" and "Sibling " become three tags, and a filter on any
one of them quietly misses most of the leads it should match.

**`export async function scheduleInterview(formData: FormData): Promise<ActionResult>`**

Schedule an interview and record a rating.

Both live on the lead rather than in a separate collection: a candidate has
one interview at a time and one current rating, and a subcollection would buy
history nobody has asked for at the cost of a second read on every open.

The interview date deliberately reuses followUpDate. The digest, the overdue
query and the attention badge already work off that field — a parallel
"interviewDate" would need all three taught about it, and would compete with
follow-ups for the same attention.

---

## `src/app/admin/(dash)/leads/bulk-actions.ts`

**`const MAX_SELECTION = 100;`**

Bulk operations on selected leads.

Bounded at a size a person can actually have reviewed. The inbox pages at 25,
so anything beyond this is not a considered selection — and a mistake applied
to 500 leads is a mistake nobody can undo by hand.

---

## `src/app/admin/(dash)/leads/export/route.ts`

**`const MAX_ROWS = 5000;`**

Export leads as CSV.

Owner-only, and audited. Everything in this file is already visible in the
console to any admin — the difference is that an export LEAVES the system.
It becomes a file on a laptop, an email attachment, a shared drive. Under
DPDP that is the moment worth restricting and recording, not the reading.

Bounded: an export is a query like any other, and "download everything" is
how a cheap feature becomes an expensive one.

---

## `src/app/admin/(dash)/resources/actions.ts`

**`const servedStraightFromStorage = (isPublic: boolean) => isPublic && publicImagesSupported();`**

Does a file shared with anyone belong at a world-readable path?

Who may see a file is the school's decision; whether the bucket can serve it
without this app is the bucket's. The Mumbai files bucket has no public read
endpoint (docs/deploy-cloudrun-cloudflare.md §9), so a `content/` object
there would be unreachable at the URL we stored — the same silent failure
publicImagesSupported() already stops for post images.

When it cannot, the file stays at the closed prefix and gets no publicUrl,
and every surface falls back to the download route, which already serves a
public file to an anonymous viewer. The audience is unchanged either way.

**`export async function updateResource(formData: FormData): Promise<ActionResult>`**

Edit a resource's details and who it is shared with.

Crossing the public boundary moves the bytes, because the prefix is the
permission (see lib/resources). Un-sharing a file that stayed at a
world-readable path would be private in the console and public in reality.

---

## `src/app/admin/(dash)/resources/page.tsx`

**`export default async function ResourcesPage(`**

The resource centre.

"Anyone" is not a label for a checkbox here, it is a storage location: a file
shared publicly is moved to a world-readable path and served straight from
Cloud Storage, and one un-shared is moved back. Nothing else in the console
relocates bytes on a save, which is why the page says so out loud.

---

## `src/app/admin/(dash)/settings/actions.ts`

**`export async function savePipeline(formData: FormData): Promise<ActionResult>`**

Save a pipeline's stages.

Stage ids are submitted as hidden fields and never derived from the label on
save. A lead stores its stage by id, so re-deriving would silently orphan
every lead on a stage whose label was edited — the lead would point at a
stage that no longer exists and drop out of its own pipeline. Renaming is
therefore safe; only adding and removing change the id set.

---

## `src/app/admin/(dash)/students/[id]/documents/[docId]/route.ts`

**`export async function GET(`**

The office opens a document on a child's record.

The staff-side twin of /portal/[studentId]/documents/[docId]. Kept separate
rather than folded into one route that decides which kind of caller it has:
two gates in one function is how a parent path ends up falling through to the
staff path. Each side proves its own right; neither can inherit the other's.

---

## `src/app/admin/(dash)/students/[id]/photo/route.ts`

**`export async function GET(req: Request, { params }: { params: Promise<{ id: string }> })`**

A student's photograph, streamed behind the admin session.

Same shape as the CV route and for the same reason: the file store is
private, there is no signed URL, and a photograph of a child must not be
reachable by anyone who happens to hold a link. It is served through this
route or not at all.

── Why the cache header matters here specifically ──────────────────────────

Unlike a CV, which is opened once, a photo is rendered on the profile and
eventually on every row of a class list. Without a cache header, thirty
photos would stream from Cloud Run on every page load: CPU, egress, and a
slow list, all repeated. `private` keeps it out of shared caches — this is a
child's face, and the CDN must never hold a copy — while still letting the
one authorised browser keep it.

`no-cache` alongside `private` is not a contradiction: it means revalidate
before reuse, so a replaced photo appears immediately rather than after an
hour, while the bytes themselves are still reused when nothing changed.

---

## `src/app/admin/(dash)/students/actions.ts`

**`export async function createStudentFromLead(formData: FormData): Promise<ActionResult>`**

Turn an admitted enquiry into a student record.

Runs in a transaction because the admission number is derived from the
highest one already issued. Two staff admitting children at the same moment
would otherwise read the same highest value and mint the same number — which
is exactly the identifier the school uses to tell two children apart, and the
field the student list paginates on.

The lead is not consumed. It stays as the record of how the family found the
school, which the funnel and referral reporting still count.

**`export async function uploadStudentPhotoAction(formData: FormData): Promise<ActionResult>`**

Replace a student's photograph.

Its own action rather than a field on updateStudent: a file upload and a form
of text inputs fail in different ways and at different sizes, and folding
them together means a rejected 3 MB photo also throws away the medical notes
someone just typed.

The bytes decide the type, not the browser's claim. An uploaded file that
says it is a PNG but is not gets refused here rather than stored and served
back to an admin's browser to interpret.

**`export async function uploadStudentDocumentAction(formData: FormData): Promise<ActionResult>`**

The office adds a document to a child's record.

Same checks as the guardian path in src/app/portal/[studentId]/actions.ts,
minus the rate limit — this side is already behind an allowlisted sign-in, so
the threat the limiter answers (an open form and a script) does not exist
here. Everything else stays: the caps, the sniffed type, the audit entry.

**`export async function deleteStudentDocumentAction(formData: FormData): Promise<ActionResult>`**

Remove a document from a child's record. Office only, by design — guardians
can add but not delete, because a school may be required to keep what it was
given.

The index entry goes first and the object second, on purpose. If the object
delete fails afterwards, the result is a stored file nobody can reach, which
costs a little storage and nothing else. The other order risks a record
pointing at a file that is gone — a download that breaks with no explanation.

---

## `src/app/admin/(dash)/students/fees-actions.ts`

**`export async function assignStructure(formData: FormData): Promise<ActionResult>`**

Put one child on a fee structure, with an optional concession.

The amount is copied onto the student rather than referenced (see
lib/feeStructures for why). The discount is stored alongside it so the
concession survives a re-apply when the structure's amount is corrected —
otherwise every price revision would quietly cancel every family's discount.

**`export async function recordPayment(formData: FormData): Promise<ActionResult>`**

Record a payment.

A transaction, for two reasons that both cost real money if skipped:

 - the receipt number is derived from the highest already issued, so two
   people at the same counter would otherwise hand out the same one;
 - the ledger row and the cached total must land together, or the student's
   balance disagrees with the receipts in the parent's hand.

The cached total uses increment() rather than a read-modify-write, so
concurrent payments add up instead of overwriting each other.

**`function parseDay(raw: string): Date | null | undefined`**

Parse a date input into local midnight, or null for a deliberate clear.

Local midnight because the buckets in lib/feeStatus compare against the
school's start of day. `new Date("2026-08-20")` is parsed as UTC, which in IST
lands at 5:30 AM on the 20th — close enough to look right in testing and
wrong enough to put a due date on the previous day for anyone west of us.

**`export async function setFeeDueDate(formData: FormData): Promise<ActionResult>`**

Set (or clear) the date the outstanding balance falls due.

Without this every family owing anything looks identical to the console, so
the only available action is to message all of them on the same day — the
blast that teaches parents school fee reminders are safe to ignore.

**`export async function logFeePromise(formData: FormData): Promise<ActionResult>`**

Record that a parent said when they will pay.

"I'll pay by next week" is the commonest reply to a fee reminder, and on
paper it goes in the margin of a register and is forgotten by the time next
week arrives. That forgotten callback is where most uncollected fees are
actually lost — not to refusal, but to nobody following up.

Storing the date does two things: it silences the chase until the date passes
(so a parent who committed is not nagged in the meantime), and it puts them
at the very top of the list the morning after it does.

**`export async function markFeeReminded(formData: FormData): Promise<ActionResult>`**

Note that a reminder went out.

The WhatsApp message itself is sent from the staff member's own phone, so the
system cannot observe it. Recording the click is the only signal available,
and it is enough for the one job that matters: stopping a second staff member
messaging the same family about the same balance an hour later.

---

## `src/app/admin/(dash)/students/import/actions.ts`

**`export async function importStudents(formData: FormData): Promise<ImportOutcome>`**

Parse a CSV and either preview it or write it.

Preview is the default and the only way to reach a write is a second,
explicit submit. Bulk-creating children from a spreadsheet nobody has looked
at is how a roll ends up with 200 subtly wrong records that are far harder to
clean up than to prevent.

---

## `src/app/api/auth/parent-session/route.ts`

**`export async function POST(req: Request)`**

Exchange a verified phone credential for a parent session.

Rate limited harder than the admin login. Phone sign-in is the first surface
here with a per-attempt cost to the school — every code Firebase sends is a
billed SMS — so an unthrottled endpoint is an invitation to spend someone
else's money. The limit is on this exchange as well as on Firebase's own
send, because a caller who already has tokens can otherwise hammer it.

---

## `src/app/api/resources/[id]/route.ts`

**`export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> })`**

Download a resource that is not public.

Public files never reach here — they are served straight from Cloud Storage,
which costs this app nothing and caches. This route exists for the files that
must stay behind a session, and it streams them rather than handing out a
signed URL, for the reasons recorded in lib/storage: a signed URL keeps
working after sign-out, survives in history, and needs an IAM permission the
runtime may not hold.

The viewer is resolved from the session cookie, never from the request. A
parameter that said which audience you belong to would be a parameter anyone
could set.

---

## `src/app/portal/[studentId]/actions.ts`

**`export async function uploadDocument(formData: FormData): Promise<ActionResult>`**

A guardian uploads a document for their own child.

This is the only write path in the system that a member of the public can
reach, and it accepts files. Everything below is load-bearing:

  - Authorisation comes from the session, never the form. The student id is
    checked against the children this parent actually has, resolved
    server-side from their verified claim. A parent posting another family's
    id gets the same answer as one posting a made-up id.

  - Rate limited per client address. Without it, one script turns a form into
    an unbounded storage bill.

  - Capped in both directions: per file, and per child. A cap on file size
    alone still allows ten thousand small files.

  - The bytes decide the type. A file claiming to be a PDF that is not gets
    refused before it is stored, rather than being handed to an admin's
    browser later to interpret.

  - Audited with the guardian's verified identity, because a school should be
    able to answer who put a document on a child's record.

**`async function asRequest(): Promise<Request>`**

getClientIp takes a Request; a server action has headers() instead. Wrapping
them keeps one implementation of "which address do we trust", rather than a
second copy here that could drift from the edge-token rule.

---

## `src/app/portal/[studentId]/documents/[docId]/route.ts`

**`export async function GET(`**

A guardian downloads a document from their own child's record.

Deliberately a separate route from the admin one, rather than a single route
that works out which kind of caller it has. Two gates in one function is how
a system ends up with a parent path that falls through to the staff path;
here each side proves its own right and neither can inherit the other's.

assertOwnStudent resolves the parent's children from their verified session
claim, never from this URL. A guardian probing another family's id gets 404 —
the same answer as for a child that does not exist, so the URL cannot be used
to learn which records are real.

---

## `src/app/portal/resources/page.tsx`

**`export default async function PortalResourcesPage()`**

Files shared with parents.

Not filtered by the parent's own children's classes. A class-specific
worksheet is not sensitive, and filtering would need a per-child query on
every load to save a family from scrolling past a form for another class.

ponytail: filter by classSection against the parent's children if the list
ever gets long enough to be annoying.

---

## `src/components/admin/ActionForm.tsx`

**`export function ActionForm(`**

A form whose server action reports failure by returning rather than throwing.

Exists so every admin form shows its own errors in place. Previously an action
that threw took the whole page to the error boundary with an opaque digest —
an admin logging a call would lose the screen and be told nothing. Here the
message lands under the form that caused it and the inputs stay filled.

---

## `src/components/admin/LeadBoard.tsx`

**`export function LeadBoard(`**

The pipeline as columns.

── On drag and drop ────────────────────────────────────────────────────────

There isn't any, deliberately. A board's value is seeing the whole pipeline
at once; dragging is one way to move a card and not the reason to build one.

Making drag work properly here means touch support — HTML5 drag events do
nothing on a phone — which means either a dependency or hand-written pointer
handling, plus a keyboard path so the board is not mouse-only. That is a
sizeable amount of code and risk in exchange for a gesture, when a two-tap
stage change works everywhere, on every input, today.

Worth adding later if staff ask for it. Not worth blocking the board on.

**`function move(row: LeadRow, to: string)`**

Move a card between columns optimistically, and put it back if the write
fails. Same contract as the list view: the screen must never keep a change
that Firestore rejected, or the board quietly disagrees with the database.

---

## `src/components/admin/LocationFields.tsx`

**`type State =`**

Hidden position fields for any form the campus fence guards.

The browser is asked for a position on mount and the answer is posted as
three ordinary form fields. It is NOT asked for a verdict: the server does
the trigonometry, against the campus pin the client never sees. All this
component can do is supply a position or fail to, and both are handled
server-side in the attendance actions.

Failure is deliberately not hidden. A teacher who blocked the permission
needs to know that before they tap Save, not after the server refuses —
so the state is on screen with a way to ask again.

---

## `src/components/admin/NavLink.tsx`

**`export function isActive(pathname: string, href: string): boolean`**

Sidebar link that knows whether it is the current section.

The active state used to be hardcoded onto Leads, so every page in the
console looked like Leads no matter where you were.

"/admin" is a prefix of every other route, so a plain startsWith would light
every item at once. Leads owns the index and its own detail pages; everything
else matches its own subtree.

---

## `src/components/admin/RegisterSummary.tsx`

**`export function RegisterSummary(`**

Live count of what is currently marked, above the register.

The register defaults everyone to present and asks the teacher to mark the
exceptions, which means the number that matters — how many are away today —
is invisible until after saving. On a phone, with the list scrolled past, it
is invisible even then.

Deliberately reads the form rather than owning the state. The register is a
plain uncontrolled form of radio inputs; lifting twenty children's statuses
into React to display two numbers would be a rewrite of the thing that
already works, and would put the saved value and the displayed value in two
places that can disagree.

---

## `src/components/admin/RemindButton.tsx`

**`export function RemindButton({ studentId, href }: { studentId: string; href: string })`**

Opens the pre-filled WhatsApp reminder and records that it went out.

The message itself leaves from the staff member's own phone, so the system
can never observe delivery. Logging the click is the only signal available,
and it buys the one thing that actually matters: a colleague opening this
page an hour later can see the family has already been contacted today and
does not message them a second time.

The anchor keeps its real href, so middle-click and "open in new tab" behave
normally; the action fires alongside rather than instead of the navigation.

---

## `src/components/admin/StagePill.tsx`

**`export function StagePill({ stage, stages, className }: { stage: string; stages: StageView[]; className?: string })`**

Status pill for a stage.

Takes the resolved pipeline rather than looking a stage up itself: stages are
configuration now, and configuration is server-only and async. The caller
already has the pipeline, so passing it keeps this a plain render.

---

## `src/components/admin/StudentDocuments.tsx`

**`export function StudentDocuments(`**

A child's documents, in the console.

The staff-side view of what guardians upload through the portal, plus the
office's own additions. Deletion lives here and only here: a guardian can add
but not remove, because a school may be required to keep what it was given.

Who uploaded each file is shown rather than hidden. When the office is
deciding whether to remove something, "the parent sent this" and "we added
this ourselves" are different situations.

---

## `src/components/admin/StudentImport.tsx`

**`export function StudentImport()`**

Two-step import: preview, then commit.

The commit button only appears once a parse has succeeded, so the only way to
write is to have seen exactly what will be written. Bulk-creating children
from an unexamined spreadsheet produces a roll that is far harder to clean up
than to get right the first time.

---

## `src/components/admin/StudentPhoto.tsx`

**`export function StudentPhoto(`**

A child's photograph, and the control to replace it.

The image is fetched from /admin/students/[id]/photo, which sits behind the
admin session — the file store is private and there is no URL for this that
works without one. That is deliberate: a photograph of a child should not be
reachable by anyone who happens to hold a link.

Rendered with a plain <img> rather than next/image. The route is
authenticated and per-request, so the optimiser would either bypass it or
cache a child's face in a shared layer — and width and height are fixed here
anyway, so there is no layout shift to prevent.

---

## `src/components/home/Trust.tsx`

**`export function Trust()`**

Verifiable credibility, where the design mock had a testimonial.

A quote the school writes about itself carries no weight, and inventing one
is out of the question. An affiliation a parent can telephone and check does
the same job honestly.

---

## `src/components/layout/FloatingLead.tsx`

**`export function FloatingLead({ waBase }: { waBase: string })`**

Persistent lead widget on every marketing page: an "Enquire now" pill plus
round Call and WhatsApp buttons. Most parents here prefer a phone or a
WhatsApp message to a form, so both channels stay one tap away — and the
WhatsApp message encodes the current path, so replies land tagged with where
the parent was reading.

The pill hides on very small screens; the two round buttons never do.

---

## `src/components/pages/FactSections.tsx`

**`const tints =`**

Sections driven entirely by `content/facts.ts`.

Every one of these returns `null` while its slot is empty. That is deliberate
and load-bearing: a half-filled "Our fees" heading over a "coming soon" is
worse than no fees section at all, and an invented ratio is worse than both.
The school fills a slot, the section appears; nothing else has to change.

**`export function Fees()`**

The fee schedule.

A parent who cannot find a price does not enquire to discover it — they close
the tab and open a competitor's. This is the highest-value slot in the file.

**`export function DayTimeline()`**

The timetable, with clock times.

"Morning arrival and circle time" tells a parent nothing they could not have
guessed. "9:00 — arrival and free play" tells them what their child's morning
is actually shaped like.

---

## `src/components/portal/PortalDocuments.tsx`

**`export function PortalDocuments(`**

A child's documents, for their guardian.

Downloads go through /portal/[studentId]/documents/[docId], which re-checks
the session against this child on every request — the link cannot be
forwarded to anyone who is not a guardian, and the file store has no public
address at all.

Guardians can add but not remove. A school may be required to keep what it
was given, so deletion is an office action; the copy below says so rather
than leaving a parent hunting for a button that is not there.

---

## `src/components/SchoolContact.tsx`

**`export type SchoolContact =`**

The school's contact details, for client components.

These are configuration, which is server-only and async. Threading them as
props reached four levels deep (page → CTA → CaptureForm → error fallback),
where every intermediate component had to carry values it did not use.
One provider at the layout keeps the resolution server-side and the drilling
out of components that are not about contact details.

---

## `src/components/ui/CountUp.tsx`

**`export function CountUp({ to, className }: { to: number; className?: string })`**

Counts from zero to `to` the first time it scrolls into view.

Renders the final number on the server, so with JS off or before hydration
the stat is correct rather than a stray "0". The drop to zero happens on the
animation's first frame once the element is in view, never during render.

---

## `src/components/ui/EyebrowPill.tsx`

**`export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string })`**

Section eyebrow — hand-lettered rather than the usual uppercase tracking-wide
label. Tilted a couple of degrees so it sits on the page like a note rather
than a form field.

---

## `src/components/ui/PageHero.tsx`

**`export function PageHero(`**

Compact hero for interior pages.

`highlight` names words inside `title` to render in rainbow letters. They are
matched literally; a word that is not in the title is ignored, so a copy edit
can never break the page.

---

## `src/components/ui/Rainbow.tsx`

**`export function RainbowWords({ text, words }: { text: string; words?: string[] })`**

Colours one or more whole words inside a heading. Words are matched
literally; anything not found is simply left alone, so a copy edit can never
break a heading. Each word restarts the cycle, so every highlighted word
opens on the brand emerald.

---

## `src/components/ui/Reveal.tsx`

**`export function Reveal(`**

Gentle entrance reveal. Animates in on viewport entry but NEVER leaves content
hidden: it always ends visible (whileInView + fallback animate), and collapses
to static under prefers-reduced-motion.

---

## `src/components/ui/Section.tsx`

**`export function Section(`**

Section rhythm.

Mobile gets a much tighter pad than desktop. At the old flat `py-20` the home
page spent 1,440px — a fifth of its entire height on a phone — on the gaps
between sections alone.

The default is responsive, which puts a trap in `cn`: it is a plain join, not
tailwind-merge, so a caller's bare `pt-0` sits outside the media query and
loses to `sm:py-20`. Every padding override passed to a Section therefore
needs an `sm:` twin — `pt-0 sm:pt-0`, not `pt-0`. There is a test that walks
the source and fails if one is missing.

---

## `src/components/ui/SwipeRail.tsx`

**`export function SwipeRail(`**

A row of cards that swipes on phones and becomes a grid from `sm` up.

Every card grid on this site was authored for desktop and simply collapsed to
one column on a phone, which turned the home page into thirteen screens of
scrolling against desktop's seven. Four stacked cards is roughly 1,600px of
vertical travel to read four short paragraphs.

A carousel with a next button would hide three of those four behind taps, and
on a page whose job is persuasion that is the wrong three to hide. A snapping
rail keeps all of them in the document, uses the gesture people already make
on a phone, and — because the next card peeks in at the edge — actually shows
that there is more, which a button never does.

No JavaScript: this is `overflow-x` and CSS scroll-snap.

`label` is required because the rail is a focusable scroll region; a keyboard
user tabbing onto it needs to be told what they have landed on.

**`itemClassName?: (index: number) => string;`**

Per-item wrapper classes, by index. The wrapper is the grid item once the
rail becomes a grid, so a bento layout's column spans have to land here
rather than on the card inside it.

---

## `src/content/facts.ts`

**`export type KeyFact = { icon: string; label: string; value: string };`**

Facts only the school can supply.

Parents choose a preschool on specifics — ratio, fees, safety, who the
teachers are, what the first two weeks look like. Adjectives ("warm",
"nurturing") are what every competitor writes, so they persuade nobody.

Everything in this file starts empty, and every section that depends on a
value renders NOTHING until that value is filled. That is the whole point:
the site can never show a placeholder, a "TBD", or an invented number. Fill a
value here and the section appears on its own.

`docs/school-facts-needed.md` is the same list written for the school to
answer. When answers come back, they get typed in here — nowhere else.

**`keyFacts: KeyFact[];`**

Headline numbers for the "By the numbers" strip. A top-three factor in
every parent survey, and currently the loudest silence on the site.
Example: { icon: "groups", label: "Teacher to child", value: "1:10" }

**`fees:`**

Fee schedule. The single biggest drop-off point: a parent who cannot find
a price does not enquire to discover it, they close the tab.
`note` carries anything conditional (sibling discount, one-time charges).

**`day: DayBlock[];`**

The actual timetable, with clock times. "Morning arrival & circle" tells a
parent nothing; "9:00 Arrival and free play" tells them everything.

---

## `src/content/pages.ts`

**`export const trust: TrustPage =`**

Why a family can believe us, stated as checkable facts.

This replaces the testimonial section the design mock shipped. A quote we
wrote ourselves is worth nothing; an affiliation a parent can ring up and
verify is worth a great deal.

---

## `src/content/types.ts`

**`export type ProgramLevel =`**

One year of the programme. Parents choose by year — "what will my child do in
Pre-KG?" — not by subject, so the three levels are the spine of the page and
the subject breakdown is supporting detail.

**`method:`**

How we teach, not what we teach. The year-by-year section above already
covers content; repeating the subject list under a second heading was
saying the same thing twice.

**`quranMethod:`**

Representative imagery for the Qur'an method, not photos of Al Fitrah's
own students — captioned generically for that reason. Swap for real
classroom photos if/when the school supplies them.

**`export type TrustPage =`**

Verifiable credibility, in place of testimonials. Every line here is a fact
that can be checked — an affiliation, a named curriculum, a published policy
— rather than a sentiment a competitor could copy in thirty seconds.

---

## `src/lib/actionResult.ts`

**`export type ActionResult = { ok: true } | { ok: false; error: string };`**

Return type for server actions.

Server actions used to signal failure by throwing. In development that shows
the message; in production Next replaces it with an opaque digest and the
error boundary takes over — so an admin mid-triage clicks a stage dropdown,
the page blanks, and nothing on screen says why or what to do. Worse, the
failures being thrown were mostly ordinary and expected ("that lead is gone",
"that date doesn't parse"), not exceptions.

Returning a result makes the expected failures renderable next to the control
that caused them. Genuine bugs still throw and still reach the error boundary,
which is where they belong.

**`export async function attempt(`**

Wrap an action body so an unexpected throw becomes a message the UI can show.

`redirect()` and `notFound()` work by throwing a control-flow signal that Next
catches upstream; swallowing those would break navigation in a way that looks
like the action silently did nothing. They are re-thrown untouched — hence
the digest check rather than a blanket catch.

---

## `src/lib/adminAuth.ts`

**`export const getAdmin = cache(async (): Promise<{ email: string; role: Role } | null> =>`**

The signed-in admin, or null.

For the places where not being an admin is an ordinary outcome rather than a
mistake — the resource download route serves parents and staff from the same
URL, and redirecting a parent to the admin login would be nonsense. Every
page and action wants requireAdmin() below instead.

Wrapped in React cache() so a request verifies the session cookie once.

**`export async function requireOwner(): Promise<{ email: string; role: Role }>`**

Gate for destructive actions. Throws rather than redirects: this guards
server actions, where a redirect would look to the user like the action
quietly succeeded.

Server-side only, never a UI concern — hiding a button is a courtesy, not a
control, and a staff account can post the form directly.

---

## `src/lib/attendance.ts`

**`export type AttendanceStatus = string;`**

Attendance.

One document per class per day, holding a student → status map — NOT one
document per student per day. This is the single decision that keeps
attendance affordable, so it is worth stating the arithmetic.

For a six-class school with twenty children each, over a 22-day month:

  per class-day    6 × 22            =   132 writes/month,  1 read per register
  per student-day  6 × 20 × 22       = 2,640 writes/month, 20 reads per register

Twenty times the writes, twenty times the reads, for a strictly worse query:
marking a register means writing one document either way, but reading one
back means twenty gets instead of one. Firestore's free tier is 20,000
writes/day, so the naive shape isn't fatal on its own — it is fatal in
combination with everything else, and it gets worse every year the school
grows while the good shape stays flat in class count.

The document id is derived, not random: `{academicYear}_{section}_{date}`.
That makes marking idempotent (re-submitting overwrites rather than
duplicating), and it means opening today's register is a single get by id
with no query and no index at all.

**`export function defaultStatusFor(key: string, statuses: { id: string; present: boolean }[], nonSchoolDays: number[] = [0]): AttendanceStatus | null`**

Default status when a register has never been saved.

Everyone present, because that is the common case and a teacher should only
have to mark the exceptions. Null on a Sunday or a future date, where there
is nothing to default — and defaulting those to "present" would manufacture
attendance for days that never happened.

**`export function summarise(`**

Summarise one child's attendance across a set of registers.

Which statuses count as present, and which count at all, are configuration —
so they are passed in rather than baked in. An authorised absence should
neither credit attendance nor count against the child, and a school may
define more statuses than the four that ship.

**`export async function listRegisters(`**

Registers for one class across a date range.

Reads are bounded by the range, not by class size — a month is at most ~31
documents however many children are in the class.

**`export const ROLLUPS = "attendanceRollups";`**

Monthly totals per class, so a yearly view does not read a year of days.

A year is ~220 registers per class. Drawing a trend from the registers
themselves is ~1,320 reads per view across six classes, which is exactly the
kind of cost that grows with how long the school has been open. One rollup
document per class-month makes it twelve document reads, addressed by id, so
there is no query and no index — the same property that makes opening a
register a single get.

Written in the register's own batch. A separate write means a crash between
the two leaves a month that disagrees with its own days, and nothing would
ever notice: no read path compares them.

**`export function countByStatus(`**

What one register contributes to its month, keyed by status id.

Stored under status ids rather than as present/absent totals. Whether "late"
counts as present is a settings decision the school can change later, and a
rollup that had resolved it at write time would make its own history wrong
the day they changed their mind. The percentage is derived on read from the
statuses as they are configured then.

Writes an explicit zero for every configured status. The rollup is merged
into, not replaced, and Firestore merges maps field by field — a status left
out of the map would keep yesterday's number. Correcting a day from two
absences to none would leave the two behind.

**`export function summariseMonth(`**

The read side of the rollup, and the reason it is not an increment.

`EXPANSION_PLAN.md` §4.2 specifies increments. Increments are wrong here,
because the register is deliberately re-saveable — the page tells the teacher
they can save again to correct a day — and a second save would increment the
month a second time. Attendance would inflate silently, with no error and
nothing to compare against. So the document holds `days: { "2026-09-17":
{ present: 12, late: 1, absent: 2 } }` and a re-save overwrites that day's
entry. Totals are summed over at most 31 entries on read, which costs nothing
next to the read it saves.

Days where nothing counted — a holiday, a status the school has since
removed — do not increment `daysMarked`. A month the school was closed should
read as unmarked, not as a month the children failed to come.

**`export function academicYearMonths(academicYear: string): string[]`**

The twelve months of an academic year, June to May.

Derived from the year label rather than from what exists in the database, so
a month nobody marked still gets a row saying so. A trend that silently omits
its empty months is a trend that hides the gap it should be showing.

---

## `src/lib/attention.ts`

**`export const DEFAULT_TERMINAL_STAGES = new Set(["admitted", "lost", "hired", "rejected"]);`**

Terminal stages are configuration now, so callers pass the resolved set.
The default covers the shipped pipelines, which keeps the client board — the
one caller that cannot read settings — working without a round trip.

---

## `src/lib/audit.ts`

**`export const COLLECTION = "auditLog";`**

Audit log.

The brief requires auditing every important action. Until now those actions
called console.log, which is not queryable: nobody can answer "who moved this
lead to Lost last month", or "what did this account change before it was
removed". A log you cannot query is a log you do not have.

Append-only, like the fee ledger and for the same reason: the value of an
audit record is that it cannot be revised after the fact. There is no update
path and no delete path in this module.

Entries are written on the SAME BATCH as the action they describe, so an
audited action cannot succeed while its record silently fails. That is the
whole point — a best-effort audit is one that is missing precisely when
something went wrong. Where a caller was doing a bare `.update()`, it becomes
a two-write batch; that costs one round trip, not two.

**`export const RETENTION_DAYS = 730; // two years`**

How long entries are kept. Firestore TTL deletes on `expiresAt`, so this is
enforced by the database rather than a cron job that can silently stop.
See docs/ops.md for enabling the policy.

**`export async function recordAudit(entry: AuditInput): Promise<void>`**

Record an entry for an action that has no batch of its own.

Only for actions whose own write already succeeded and cannot be joined —
a redirect-terminated flow, or a multi-document transaction that has already
committed. Prefer queueAudit.

**`export async function listAudit(`**

Recent activity, newest first, optionally narrowed to one actor or entity.

Paginated on `at` + document id: `at` alone has no total order, so entries
written in the same millisecond would be skipped or repeated at the seam —
the same tiebreak the leads inbox needs.

---

## `src/lib/csv.ts`

**`/**`**

CSV writing.

The parser in lib/studentImport reads spreadsheets; this writes them. Kept
separate because the risks run in opposite directions: reading is about
tolerating messy input, writing is about not producing dangerous output.

**`export function csvField(value: unknown): string`**

Escape one field.

Two jobs. The ordinary one is quoting: a parent named "Khan, Ayesha" would
otherwise split into two columns.

The other is CSV injection. Excel and Sheets evaluate any cell beginning with
`=`, `+`, `-` or `@` as a formula, so a lead whose name is
`=HYPERLINK("http://evil","Click")` becomes a live link in the school's
spreadsheet — and `=cmd|...` can do considerably worse. The value is an
attacker-controlled string that arrived through a public form, so it is
prefixed with a single quote, which spreadsheets treat as "this is text".

**`export function csvDocument(header: string[], rows: unknown[][]): string`**

A complete CSV document.

Prefixed with a UTF-8 BOM: without it Excel on Windows reads the file as the
system codepage and mangles every non-ASCII name — which, for a school in
Bengaluru, is most of them.

---

## `src/lib/fees.ts`

**`export const PAYMENTS = "payments";`**

Fees.

Two pieces, and the split is the important part:

  payments/{id}          an APPEND-ONLY ledger. Never updated, never deleted.
  students/{id}.fees     { totalPaise, paidPaise } — a cache of the ledger.

The obvious design is a mutable "amount paid" field on the student that each
payment overwrites. That loses money: two staff recording payments at the
same moment both read 5000, both write 7000, and one parent's ₹2,000
disappears with no error and no trace. It is the one class of bug in this
system that cannot be reconstructed after the fact, because the evidence is
the thing that was overwritten.

So payments are immutable rows and `paidPaise` is maintained with
FieldValue.increment — atomic server-side, so concurrent payments add rather
than clobber. `paidPaise` is a cache, not the truth: reconcile() recomputes it
from the ledger with a sum() aggregation, and the ledger always wins.

A correction is a new negative-amount row (a refund or an adjustment), never
an edit. The ledger stays an accurate history of what actually happened.

**`dueDateMs: number | null;`**

Collection state. A balance alone cannot tell an office who to ring today —
see lib/feeStatus.ts for why these three fields exist and how they rank.

**`structureId: string | null;`**

Which price list this total came from, when it came from one. The amount is
copied rather than looked up (see lib/feeStructures), so this is provenance
— what to re-apply after a revision — not the source of the number.

**`export const PAYMENTS_PAGE_SIZE = 50;`**

A student's payment history, newest first.

Bounded: a preschool child accrues a handful of payments a year, and a list
that grows without limit is the pattern this codebase keeps removing.

**`export async function reconcile(studentId: string): Promise<{ cachedPaise: number; ledgerPaise: number }>`**

Recompute a student's paid total from the ledger.

The reconciliation path for the cached `paidPaise`. sum() is an aggregation
query — one read per 1000 rows matched rather than one per row — so verifying
a student costs about as much as trusting them.

Returns both figures so the caller can report a discrepancy rather than
silently overwriting; a mismatch means something wrote outside the intended
path, and that is worth knowing about, not quietly papering over.

**`export function nextReceiptNumber(year: number, highest: string | null): string`**

Next receipt number for a year, as `RCP-2026-0001`.

Same shape and the same reasoning as admission numbers: zero-padded so string
ordering matches numeric ordering, and allocated inside a transaction because
two people taking money at the same counter must not be handed the same
receipt number.

---

## `src/lib/feeStatus.ts`

**`export type FeeBucket`** (was `FEE_BUCKETS`, a runtime array, until nothing used it)

Which families to chase, and in what order.

A balance on its own cannot tell you that. "₹18,000 outstanding" is the same
number whether the fee falls due next month, fell due in June, or fell due in
June and the parent promised on the phone to clear it a fortnight ago. Those
are three completely different conversations, and only the third one is
urgent.

Without that split the only thing an office can do is message everyone who
owes anything on the same day of the month — which is precisely why parents
stop reading school fee reminders. This module exists so the console can ask
for the twelve families actually worth a phone call this morning.

Pure and dependency-light on purpose: no Firestore, no `server-only`, so the
bucketing can be unit-tested without standing up an emulator.

**`export const FEE_BUCKET_RANK: Record<FeeBucket, number> =`**

How hard each bucket should be pushed, low number first. Drives ordering in
the console so the most recoverable money is at the top of the screen rather
than wherever the alphabet happens to put it.

**`export function feeBucket(f: FeeSchedule, now: Date = new Date()): FeeBucket`**

Classify one family.

Order of precedence matters and is the whole point:

 1. Nothing owed, or no fee set — not a collection problem at all.
 2. A promise that has come and gone outranks everything. The parent named
    the date themselves, so this is the most recoverable money in the system
    and the easiest call to make.
 3. A promise still in the future silences the chase, even if the fee is
    already overdue. Messaging someone three days after they told you when
    they would pay is how a school teaches parents to ignore it.
 4. Otherwise fall back to the due date.

**`export function feeReminderText(opts:`**

The reminder a staff member sends.

Deliberately specific: the child's name and the actual amount, not a template
blast. A parent owing ₹2,000 and a parent owing ₹45,000 receiving identical
wording is how both learn the message means nothing.

It also never threatens. This is a preschool, the parent is usually someone
the office knows by sight, and a hard letter costs more goodwill than the
balance is worth.

---

## `src/lib/feeStructures.ts`

**`export const COLLECTION = "feeStructures";`**

Fee structures — what a year of school costs, defined once.

Until now every child's total was typed in by hand on their own record. For
one enrolment that is fine; for a roll of two hundred it is two hundred
chances to key ₹2,500 where ₹25,000 was meant, and no way to answer "what is
the Nursery fee this year" without reading the roll.

A structure is the school's price list: a named amount for an academic year,
optionally scoped to one program. Assigning it to a child copies the amount
onto `students/{id}.fees` rather than pointing at it.

Copying rather than joining is deliberate, twice over:

 - The parent portal and the dues list read a student and must not then read
   a structure per child to know what is owed. One document, one read.
 - A structure edited next year must not silently restate what last year's
   families were charged. The amount a child owes is a fact about that child
   at the moment it was assigned, not a live lookup.

`structureId` is kept alongside the copied amount so the school can still see
which price list a child was put on, and re-apply it after a revision.

The expansion plan (docs/EXPANSION_PLAN.md §2.4) proposed a separate
`feeAssignments/{studentId}` collection. It is exactly one document per
student, keyed by student id, read only alongside the student — which is a
description of fields on the student document. Folded in; one collection
fewer, and the portal's single read is preserved by construction.

**`export const MAX_STRUCTURES = 100;`**

A school's price list is a page, not a database. The cap exists so this
query can never become an unbounded collection read (cost invariant 1); if a
school genuinely defines more than this many fees in a year, the list needs
pagination and someone should think about why.

**`export function netTotalPaise(amountPaise: number, discountPaise: number): number`**

What a child actually owes: the structure's amount, less any concession.

Clamped at zero. A discount larger than the fee is a typo, and letting it
through would write a negative total, which the balance arithmetic would
then read as the school owing the family money.

---

## `src/lib/firebaseAdmin.ts`

**`let app: App | undefined;`**

Server-only Firebase Admin init.
Credentials resolution order:
 1. FIREBASE_SERVICE_ACCOUNT_KEY  — full service-account JSON (string), for local dev.
 2. Application Default Credentials — used automatically on Firebase App Hosting.
Never import this from a Client Component.

---

## `src/lib/firebaseClient.ts`

**`export async function sendParentOtp(phoneE164: string, containerId: string)`**

Phone sign-in for parents.

Firebase requires a reCAPTCHA verifier before it will send a code — it is the
only thing standing between a public form and an unbounded SMS bill. The
invisible variant keeps it out of the parent's way while still gating sends.

**`export async function sendParentEmailLink(email: string): Promise<void>`**

Email-link sign-in for parents. No password, and no per-message cost.

Firebase sends a one-time link; clicking it completes sign-in. The address is
kept in localStorage because the link may be opened in a different tab, and
Firebase needs to confirm the same address it sent to — without it the parent
is asked to retype the address they just entered.

---

## `src/lib/geofence.ts`

**`const EARTH_RADIUS_M = 6_371_000;`**

Distance and campus-fence evaluation for staff check-in.

The distance is computed HERE, from raw coordinates, and the check-in time is
the server's. The client sends a position and gets judged; it never sends its
own verdict and never its own clock. Everything else in this file follows
from that one rule.

WHAT THIS ACTUALLY DEFENDS AGAINST — worth being exact, because the feature
is sold as "teachers cannot mark attendance from home":

  Stops: opening the register at home and marking yourself in. The position
         the browser reports is genuinely somewhere else, and the server
         refuses it and writes the attempt to the audit log with coordinates.

  Does not stop: someone who opens devtools and overrides the geolocation
         sensor, or runs the browser with a mocked location. Browser
         geolocation is client-supplied and there is no version of this that
         survives a determined spoofer.

That is a real control against casual abuse by ordinary staff, and it leaves
evidence either way. It is not proof of presence. If it ever needs to be,
the next rung is a native app reading the campus wifi BSSID, or a rotating
code posted in the staff room — both of which move the secret off the client.

**`export function evaluateFence(`**

Judge a reported position against the campus.

`accuracyM` is the radius the browser itself reports. Indoors it is routinely
50-100 m and can be far worse, which is exactly where teachers stand when
they mark attendance. So the fence is widened by the reported accuracy rather
than compared against a hard edge: a teacher genuinely inside the building
with a poor fix is not marked off-site for it.

`unreliable` is a separate signal from `withinFence` on purpose. A position
accurate to ±2 km technically "overlaps" any campus, and reporting that as a
clean pass would be dishonest — it is a non-answer, and the register should
say so rather than quietly count it as present.

**`export function judgeCheckIn(`**

Decide whether a check-in may proceed.

The single place the block lives, so staff check-in and the class register
cannot drift apart on what "at school" means.

Note how `unreliable` is handled when enforcing: it is refused, not waved
through. evaluateFence widens the fence by the browser's own reported
accuracy, which is right for an honest indoor fix of ±120 m and wrong for a
claimed ±5 km — that would "overlap" any campus on Earth and pass. Refusing
the vague fix caps the widening at maxAccuracyM and closes that door. The
cost is a teacher deep inside the building occasionally being told to try
again near a window, which is a worse experience than a false pass and a
better outcome.

**`export function parseReportedPosition(formData: FormData): ReportedPosition | null`**

Read a reported position out of a form post.

Everything here is attacker-controlled — it arrives as ordinary form fields —
so it is range-checked before it is trusted enough to do trigonometry with.
A NaN latitude would propagate through haversine and come out as a NaN
distance, which compares false against every bound and would quietly refuse
every honest teacher.

Returns null rather than a partial position: half a coordinate is not a
location, and judgeCheckIn treats "no position" as its own case.

---

## `src/lib/leadDedupe.ts`

**`/**`**

Duplicate detection for leads.

A school gets the same parent twice constantly: they fill the website form,
then walk in a week later and the receptionist logs them again. Today that is
two records, two people calling, and a funnel that double-counts.

The rule that shapes everything here: NEVER silently drop or merge an
enquiry. A second enquiry from the same number is often legitimate — a second
child, a year later, a different program. Losing one to tidy the list is far
worse than showing two linked records and letting a human decide.

So a suspected duplicate is created, LINKED, and surfaced. Never discarded.

**`export function phoneKey(phone: string): string | null`**

Stable key for matching. Phone is the only field parents reliably repeat —
names get shortened, spelled differently, or entered as the child's.

**`export function judge(`**

Decide whether a new enquiry looks like one we already have.

Bounded by a window: the same family enquiring two years later for a younger
sibling is a new enquiry, not a duplicate, and flagging it would train staff
to dismiss the warning.

---

## `src/lib/leadOps.ts`

**`/**`**

Shared write-path helpers for leads.

The four entry points (website form, capture, staff-entered, staff
application) had drifted into four slightly different shapes. Anything that
must be true of every lead belongs here rather than being copied a fourth
time and then a fifth.

**`export async function findDuplicate(phone: string, excludeId?: string): Promise<DuplicateVerdict>`**

Find a recent lead with the same phone number.

One indexed read per submission. Submissions are low volume, and the
alternative — staff discovering the duplicate weeks later by calling the same
parent twice — is not cheaper, just invisible.

**`export function leadDefaults(phone: string, verdict: DuplicateVerdict)`**

Fields every lead must carry, whichever door it came in through.

`phoneKey` is what makes duplicate detection possible at all — without it
stored at write time, finding matches means scanning and normalising the
whole collection on every submission.

---

## `src/lib/leadQueries.ts`

**`export async function getInbox(`**

One page of the inbox, plus the counts the header needs.

Reads per call are now flat in collection size: PAGE_SIZE row reads, one
count() per stage, and two count()s for the attention badge — roughly 33,
whether the school has 200 leads or 200,000.

**`export const BOARD_COLUMN_SIZE = 10;`**

Cards shown per column. The count in the header is exact; the column shows
the newest few and says how many more there are.

Bounded per column on purpose. The natural instinct for a board is "show
every card", which is precisely the read pattern the rest of this file exists
to remove — it would make a page load linear in collection size again, and
`tests/unit/costInvariants.test.ts` guards against exactly that.

**`export async function getBoard(type: LeadType): Promise<Board>`**

The pipeline as columns.

Costs one bounded read plus one count per stage — around 66 reads for a
six-stage pipeline, against roughly 33 for the paged list. Higher, and flat
in collection size either way, which is the property that matters: a school
with 200 leads and one with 200,000 pay the same.

**`export const INSIGHTS_SCAN_LIMIT = 500;`**

Marketing summary over admission leads.

The numbers that a query can answer exactly and cheaply do come from queries:
the funnel from per-stage count() aggregations, and this month's total from a
range count(). Channel and referrer attribution needs per-document fields, so
it scans — bounded to the most recent window, which is the period anyone is
actually making decisions about. The page labels that window rather than
implying the table is all-time.

---

## `src/lib/money.ts`

**`/** Parse a rupee amount typed by a human into integer paise. */`**

Money, stored as integer paise.

Never floats. `0.1 + 0.2 !== 0.3` in IEEE 754, and a fee ledger that drifts by
a paisa per transaction is one that eventually disagrees with the receipts the
school handed a parent. Firestore has no decimal type, so the storage unit is
the smallest indivisible one and formatting happens at the edge.

---

## `src/lib/notes.ts`

**`export function queueNote(`**

Queue a timeline entry and its counter bump onto a batch.

Both halves must land together — a note without the increment makes
`noteCount` (and therefore the "untouched new lead" attention rule) wrong,
and an increment without a note inflates the badge over a note nobody can
read. Callers commit the batch.

**`export async function readNotes(`**

Read a lead's timeline, newest first.

Reads the subcollection, and falls back to the legacy array only when the
subcollection is empty. That fallback is what makes this safe to deploy
*before* the backfill runs: in the window between deploy and migration, old
leads still render their full history instead of appearing blank.

**`export async function readNotesRaw(db: Firestore, leadId: string): Promise<StoredNote[]>`**

Fetch the timeline without needing the parent document.

Split out so a caller that also wants the lead can issue both requests at
once. The subcollection path is derivable from the id alone, so waiting for
the parent first bought nothing and cost a round trip — which is the dominant
latency in a page like this, not the query.

---

## `src/lib/notify/adapters.ts`

**`/** Transactional email via Resend. Unconfigured when the API key is absent. */`**

Channel adapters.

Each one knows how to deliver a rendered message and nothing about which
events exist or when to fire. Adding a channel means adding a file like this
and listing it — no caller changes anywhere.

**`export const dashboardAdapter: NotifyAdapter =`**

In-app notifications, for the admin console.

Always available — it needs no third-party credentials, which makes it the
channel that still works when email is misconfigured. Entries expire via a
Firestore TTL rather than a cron.

**`export const whatsappAdapter: NotifyAdapter =`**

WhatsApp and SMS are declared but not implemented.

They report themselves unconfigured, so the dispatcher skips them and the
settings toggles are honest about doing nothing yet. Declaring them now is
the point of the exercise: wiring a real provider means replacing `send`
here, and no route, action or template changes.

---

## `src/lib/notify/index.ts`

**`export async function notify(event: NotifyEvent, payload: NotifyPayload): Promise<NotifyResult>`**

Emit a domain event.

Callers say what happened, never how to tell anyone. Which channels fire, and
what they say, come from configuration.

NEVER THROWS. A parent's enquiry must be saved even if every notification
channel is down — losing the lead to tell someone about the lead is the worst
possible trade. Every failure is caught, logged and reported in the result;
callers may inspect it, and are not required to.

Channels are dispatched in parallel and isolated from each other, so a broken
email provider cannot stop the in-app notice from being written.

---

## `src/lib/notify/render.ts`

**`export function render(template: string, payload: NotifyPayload): string`**

Fill `{{token}}` placeholders from a payload.

Deliberately not a template engine. Templates are edited by a school
administrator in a textarea; loops, conditionals and expressions would turn a
settings field into a place where someone can execute logic, and a broken
template into a broken page rather than a slightly odd email.

An unknown token renders as an empty string rather than the literal
`{{whatever}}` — a parent should never receive braces, and a typo in a
template should degrade quietly rather than look like a system error.

---

## `src/lib/notify/types.ts`

**`export const NOTIFY_EVENTS = [`**

Notification engine — types and the event catalogue.

Callers emit domain events and never name a channel. That is the whole point:
today `lib/email.ts` is called directly from four routes, so adding WhatsApp
would mean editing every one of them and every future one. With a dispatcher,
a new channel is one adapter plus one configuration flag.

**`export type NotifyPayload = Record<string, string | number | null | undefined>;`**

Values a template can interpolate. Flat and stringy on purpose — a template
is written by a school administrator, not a programmer, so `{{parentName}}`
has to be the whole mental model.

**`export type NotifyAdapter =`**

A delivery channel.

`send` must resolve rather than throw for an expected failure — an unset API
key, a channel that is switched off. The dispatcher isolates throws anyway,
but an adapter that reports honestly gives a better audit trail than one that
relies on being caught.

---

## `src/lib/parentAuth.ts`

**`export const PARENT_SESSION_COOKIE = "__parent_session";`**

Parent identity.

Parents sign in by EMAIL LINK where the school has an email for them, and by
phone code where it does not.

Email is the default because it is free: Firebase bills every verification
SMS, with no free allowance, and India sits in one of the more expensive
bands. Email sign-in falls under the 50,000 monthly-active-user tier that
costs nothing.

Phone is kept as the fallback because the school's own data requires it. A
phone number is mandatory on the enquiry form, the CSV import and every
guardian record; an email is optional in all three. Email-only sign-in would
lock out every family that never gave one — which, in the records as they
stand, is most of them.

THE RULE THIS FILE EXISTS TO ENFORCE: which children a signed-in parent may
see is resolved here, server-side, from the verified phone claim in their
session. It is never taken from a URL, a form field, or anything else the
browser can set. A parent seeing another family's fees or medical notes is
the worst failure this system can have, and the only reliable defence is that
the client is never asked.

**`export async function studentsForEmail(email: string): Promise<string[]>`**

Students a phone number may see.

One indexed read. `guardianPhones` is a flat array of normalised numbers kept
alongside `guardians[]`, because Firestore cannot match inside an array of
objects — without it this would be a full-collection scan on every page a
parent opens.

**`export async function createParentSession(`**

Exchange a Firebase phone credential for a parent session.

Refuses a phone that is not a guardian of any student. That is deliberate:
anyone can prove they own a phone number, so ownership alone grants nothing.
Authorisation comes from the school's own records.

**`async function resolveIdentity(`**

Map a verified token to the students it may see.

Email is checked first because it is the no-cost path and the one most
families will use; phone is the fallback for families with no email on
record. Either way the answer comes from the school's records, not from the
fact that someone controls an inbox or a handset.

**`export const getParentSession = cache(async (): Promise<ParentSession | null> =>`**

The current parent, or null.

Student ids are re-resolved on every request rather than stored in the
cookie. A cookie lives 14 days; a child can be withdrawn, or a guardian
removed, in far less. Reading the current truth costs one indexed query and
means access ends when the school says it does, not when the cookie expires.

Cached per request so a page and its data layer resolve once, not once each.

**`export async function assertOwnStudent(studentId: string): Promise<boolean>`**

Assert that a student id belongs to the signed-in parent.

Every parent-facing read of a specific child goes through this. Returning
"not found" rather than "not allowed" is intentional: a parent probing ids
should not be able to learn which ones exist.

---

## `src/lib/paymentImport.ts`

**`export type ColumnMap`**

Reading the bank's report without knowing what the bank calls its columns.

The office maps the file's headers onto the four things this needs once, in the
UI, and `guessMapping` pre-fills what it recognises. That is deliberate rather
than lazy: nobody here has seen a real SBI Collect export yet, the format
differs between institutions, and a header the bank renames next year would
otherwise break the import silently. Guessing is a convenience; the confirmation
is the contract.

`guessMapping` returns nothing for a header it does not recognise rather than
approximating. A wrong guess credits the wrong column, and an amount column that
is actually a transaction id fails loudly, while a date column read as an amount
might not.

**`export function parsePaymentCsv(text, map)`**

Every row this refuses is refused for a reason that would otherwise cost money:

- **No reference number** — the reference is what makes a payment unique, so a
  row without one could never be recognised on a second upload. Importing it
  would mean the next re-import pays the child twice.
- **A reference repeated inside the file** — the same, one upload earlier.
- **No admission number** — there is no other way to know whose payment this is.
  Names are not used for matching: two children share a name, a ledger entry
  does not.
- **An amount it cannot read exactly** — `parseRupees` refuses `1e5` and `0x10`
  where `Number()` would accept them. Money is integer paise; a float is never
  introduced.
- **Zero or negative** — a correction is a negative row recorded by hand and
  deliberately, never something that arrives in a bulk file.

**`export function resolveRows(...)`**

Three outcomes, and only one of them writes.

An unknown admission number becomes `unmatched` and is held back for the office,
never credited to the nearest match. A reference already in the ledger becomes
`duplicate` and is skipped. This is what makes re-uploading a month's report
safe, which matters because an office will do exactly that when it is unsure
whether the first attempt worked.

Idempotency lives on the reference rather than on a file hash: a bank that
re-issues the same month's report with one corrected row must import that row
and skip the rest.

---

## `src/lib/phone.ts`

**`/**`**

Phone normalisation and WhatsApp links.

The "a bare 10-digit number is Indian, prefix 91" rule was written out three
times — the cron digest, the lead detail page, and the follow-up template —
each with its own copy of the conditional. Fixing a bug in one would have
left the other two wrong, and the failure is silent: a wrong prefix produces
a valid-looking wa.me link that opens a chat with the wrong person.

Dependency-free so the public site's SEO module can share it too.

**`export function normalizeIndianPhone(phone: string): string | null`**

Digits only, with a 91 country code added to bare 10-digit Indian numbers.

A leading zero is dropped first. It is the domestic trunk prefix, not part of
the number, and people write it — "098765 43210" is eleven digits, which
without this would be stored verbatim. That is not a cosmetic difference:
guardian phone numbers are stored through this function and matched through
it again against the verified claim from Firebase (always +91…), so a number
saved with its trunk zero could never match, and that guardian could never
sign in to the portal. Nothing would report it — the lookup simply finds no
children and the parent is told the number is not on record.

**`/**`**

wa.me link for a number, optionally with pre-filled text.

Returns null when there is nothing dialable — a lead with "—" for a phone
should render no button rather than a link to wa.me/ with no recipient.

**`export function indianMobileE164(phone: string): string | null`**

E.164 for Firebase phone auth, or null when it is not an Indian mobile.

Stricter than normalizeIndianPhone on purpose, and the difference is the
consequence. That one makes something dialable out of whatever the office
typed, and a wrong guess produces a wa.me link a human then looks at. This
one decides where a one-time code is SENT, and a wrong guess delivers a
sign-in code to a stranger's handset with nothing to look at.

So it accepts only a ten-digit number starting 6-9 (every Indian mobile
does), after the trunk zero and country code are removed, and refuses
everything else rather than trimming it to fit.

---

## `src/lib/pipelines.ts`

**`export async function getPipeline(type: LeadType): Promise<StageView[]>`**

Pipelines, resolved from configuration.

Replaces the hardcoded PIPELINES/STAGE_META constants. The brief requires
stages to be configurable; these accessors are the single place that turns
stored configuration into something the rest of the app renders, so adding a
stage is an admin edit rather than a deploy.

---

## `src/lib/portalQueries.ts`

**`export type PortalChild = Pick<Student, "id" | "fullName" | "admissionNumber" | "program" | "classSection"> &`**

Reads for the parent portal.

Every function here takes the resolved session — never a student id from the
request on its own. The rule from lib/parentAuth applies at the data layer as
well as the page, because a page is one caller and the data layer is the last
place a mistake can still be caught.

**`export async function getOwnStudent(studentId: string): Promise<{ student: Student; payments: Payment[] } | null>`**

One child, only if the signed-in parent is a guardian of them.

Returns null rather than throwing on a mismatch, and the page renders a
not-found — a parent probing ids should not be able to learn which exist.

**`export function ownDays(...)`**

The register is stored per class-day, so one document holds every child in the
class. `ownDays` reduces it to one child's rows before anything reaches a page.

That reduction is the whole reason this exists rather than the page reading
registers directly. Handing a server component the raw register would put the
attendance of twenty other families into the props of a page rendered for one
of them — not displayed, but present, and one `JSON.stringify` away from being
readable. A test asserts no other child's id survives the call.

Days whose status is not counted (holidays, non-school days) are dropped rather
than shown as absences, using the same `counted` flag the admin summary uses, so
the two cannot disagree about what a school day is.

**`export async function getOwnAttendance(...)`**

One child's month, for the parent portal.

Ownership is proved first, then a single bounded query — the same
`academicYear + classSection + dateKey` composite the admin register uses, so it
needs no new index — capped at 31 documents, which is a month.

`listRegisters` in lib/attendance could not be reused: it calls `requireAdmin()`,
which is correct for the console and wrong here. Relaxing that gate to share the
function would have widened admin-only access to make a parent page work, which
is the wrong direction for the one invariant this system cares most about.

A child with no class section returns an empty month rather than an error. That
is the normal state before the school names its classes, not a fault.

---

## `src/lib/postMeta.ts`

**`export function slugify(title: string): string`**

URL-safe slug from a title.

Slugs are the public address of a post, so they are generated once at
creation and never re-derived on edit — a title typo fixed a week later must
not silently 404 every link already shared with parents.

---

## `src/lib/posts.ts`

**`export const COLLECTION = "posts";`**

News and events — the parts of the site that change without a developer.

One collection with a `type` discriminator, which is the opposite of the call
made for students. The difference is real: news and events share every field
and every query (published, newest first), differing only in whether an
`eventDate` is set. Leads and students shared a collection while sharing
almost nothing, so every read paid for fields it couldn't use. Here a split
would mean two identical collections, two identical indexes, and a merge in
memory to render a combined homepage feed.

Public pages read this through ISR, never per request. A visitor costs zero
Firestore reads; a revalidation costs one page of documents. Admin edits call
revalidatePath, so a publish is live immediately and the timed window is only
a backstop.

---

## `src/lib/resources.ts`

**`export const COLLECTION = "resources";`**

Resource centre — the school's files, shared with the people they are for.

Metadata lives here; bytes live in Cloud Storage. The document never holds a
file, only a path to one, so a list of forty worksheets costs forty small
reads rather than transferring the worksheets themselves.

WHO CAN SEE A FILE IS DECIDED BY WHERE IT IS STORED, not only by a field.

  audience includes "public"  → stored under `content/`, world-readable by
                                URL, served straight from Cloud Storage. Free,
                                cached, and no request touches this app.
  everything else             → stored under `resources/`, closed to every
                                client by the Storage rules, and reachable
                                only by streaming through an authenticated
                                route.

The public path is available only on a bucket that has a public read
endpoint. The Mumbai files bucket does not, so a public file there takes the
closed path and the download route serves it to anonymous viewers instead —
slower and billed to this app, but never a URL that 404s. See
`servedStraightFromStorage` in the resources actions.

The split matters because the alternative — one private location plus a
boolean — makes a public prospectus cost a server request and a Firestore
read per download, and makes the visibility of a leaked file depend on a
field being read correctly every time.

Changing the audience across that boundary MOVES the object (see
`moveObject`). Without that, un-publishing a file would leave it sitting at a
stable, world-readable URL that anyone who once saw it can still fetch —
exactly the leak the rules are meant to prevent.

The expansion plan (§3.1) proposed short-lived signed URLs for private files.
Streaming is used instead, for the reasons already recorded in lib/storage:
a signed URL is a bearer token that outlives the session and lands in browser
history, and signing needs an IAM permission that App Hosting's default
credentials may not hold — a failure that only appears in production.

**`export const AUDIENCES = ["public", "parents", "staff"] as const;`**

Who a file is for.

The brief listed six audiences: public, parents, students, teachers, staff,
admin. Three of those have no identity in this system yet — there is no
student login, and teachers exist only as hired applications, not as
employees (see EXPANSION_PLAN §4.3). An audience nobody can sign in as is a
checkbox that silently shares a file with no one, so only the three that
resolve to a real session exist here. `teachers` follows the `staff`
collection, and `students` follows student logins.

**`export type ScanStatus = "clean" | "pending" | "infected";`**

Virus scanning is a hook, not an implementation.

Nothing scans uploads today. The state and the gate exist anyway, because
adding them later means retrofitting a state machine onto a collection that
already has documents, and deciding then what an unscanned legacy file counts
as. Wiring a scanner is now: write "pending" on upload, and have the scanner
flip it to "clean" or "infected". Nothing else changes.

**`export function canDownload(`**

May this viewer download this file?

Pure, and the only place the question is answered, so the public page, the
portal and the download route cannot drift apart on it. Staff see everything:
they are the people who uploaded it.

**`export async function listForAudience(audiences: Audience[], max = PAGE_SIZE): Promise<Resource[]>`**

Files visible to an audience.

No auth check here on purpose: this answers "what is shared with X", and the
caller is what establishes that the viewer is an X. The public page passes
`["public"]` and is cached; the portal passes `["parents","public"]` behind
requireParent().

---

## `src/lib/roles.ts`

**`export type Role = "owner" | "staff";`**

Admin roles.

Until now every authorised address had identical rights: the receptionist
logging a phone call could delete a job opening or read any applicant's CV,
with no audit trail. Two roles is the smallest split that fixes the part
that actually matters — who can destroy things.

Roles started in env alone. The note here used to say "move to custom claims if
staff ever need to manage roles themselves" — that moment arrived with the staff
list, and the answer was a Firestore roster rather than claims.

Claims were rejected for one reason: a token outlives the decision. Revoking
someone's access has to take effect on their next request, not when their
session cookie happens to expire, and a claim baked into a five-day cookie
cannot do that. The roster is read per request (cached within the request), so
removing access in the console removes it immediately.

**Access is env OR roster, never roster alone.** `ADMIN_EMAILS` is a floor that
Firestore cannot lower. A bad write, a failed roster update, or someone
removing the wrong row must not be able to lock the school out of its own
console, and the way back in must not itself live in the database that went
wrong. The staff page shows those configured addresses and says exactly that.

`getRoster` returns `null` when the read fails, which is deliberately NOT the
same as `[]`. An empty roster means "nobody has been given access here yet",
and that is what triggers the everyone-is-an-owner bootstrap. A failed read
means "we do not know", and must not trigger it — otherwise a Firestore hiccup
hands owner rights to every allowed account until it recovers. Access itself
still degrades to the env floor, so an outage narrows what people can do rather
than locking them out.

**`export function resolveRole(...)`**

An allowed address is `owner` when env or the roster says so.

If neither names an owner, every allowed address is an owner. That keeps the
deploy that introduces roles from locking the school out before anyone has set
the variable — the failure mode of a too-clever default here is "nobody can
delete anything and nobody knows why". The permissiveness ends the moment one
owner exists anywhere, which is what makes the staff page's first owner
meaningful rather than cosmetic.

Both resolvers are pure and take their inputs, so the whole access rule is
unit-tested without a database — including the property that matters most, that
no combination of inputs locks out a configured address.

---

## `src/lib/seo.ts`

**`/** "Name, Branch" — used in titles, OpenGraph and structured data. */`**

Per-page metadata. Async because the brand comes from configuration.

Pages call this from `generateMetadata` rather than assigning to a
`metadata` const — a module-scope constant cannot await, which is what kept
school identity hardcoded.

**`export async function waEnquiryLink(context?: string): Promise<string>`**

wa.me enquiry link with a pre-filled message. `context` (usually the page or
section) is folded into the text so replies arrive tagged with where the
parent was when they reached out.

---

## `src/lib/settings/index.ts`

**`export const getSettings = unstable_cache(`**

Platform settings, cached across requests.

Configuration is read by nearly every page. Reading it per request would add
a Firestore read to every render and undo the work that took the inbox from
thousands of reads to roughly thirty. unstable_cache keeps one value per
revalidation window, shared by every request in the process, and the write
path invalidates the tag so an edit is live immediately rather than up to an
hour later.

unstable_cache is deprecated in favour of the `use cache` directive, which
needs `cacheComponents: true` in next.config. That flag changes caching
semantics for every route in the app, which is too wide a blast radius to
introduce as a side effect of adding configuration. Recorded in
docs/ARCHITECTURE.md as its own migration.

**`export async function saveSettings(patch: unknown): Promise<{ ok: true } | { ok: false; error: string }>`**

Persist a partial settings update.

Validates the merged result, not the patch: a patch is meaningless alone, and
writing one that only makes sense against a stale base is how configuration
drifts into an invalid state.

---

## `src/lib/settings/merge.ts`

**`export function mergeSettings(stored: unknown): Settings`**

Overlay a stored settings document onto the code defaults.

Deep merge for objects, but arrays REPLACE rather than concatenate. A school
that configures five class sections means exactly five — merging them into
the shipped six would resurrect a section they deliberately removed, and
attendance would keep offering a class that no longer exists.

---

## `src/lib/settings/schema.ts`

**`const stage = z.object(`**

Platform configuration, as data rather than constants.

Every module in the brief consumes at least one value that used to live in a
TypeScript constant. Making them editable after the modules are built would
mean rewriting the modules, so configuration becomes data first.

Defaults live here, in code, deliberately:
 - the platform runs with an empty `settings/` collection, so nothing breaks
   before anyone configures anything;
 - a new setting ships with a working value instead of needing a migration;
 - a corrupt or partial stored document degrades to the default rather than
   taking the site down.

The stored document is the source of truth where present. Code is the floor.

**`campus: z.object(`**

The campus, for staff check-in.

Configuration rather than env because the pin is something the office
corrects by standing at the gate and reading the distance off a check-in —
that should not need a deploy.

`enforce` ships OFF on purpose. A guessed pin with enforcement on locks
every teacher out of the register on day one, and the school has no way
to fix it without a developer. With it off, check-ins still record their
distance from the pin, so the office can watch a week of real numbers,
correct the pin, and only then turn the block on. One toggle, no deploy.

**`export const DEFAULT_SETTINGS: Settings =`**

Shipping defaults — the values previously hardcoded across lib/.
Changing one here changes the behaviour of any school that has not overridden it.

---

## `src/lib/staffAttendance.ts`

**`export const COLLECTION = "staffAttendance";`**

Staff check-in.

One document per DAY, holding a staff-member → check-in map — the same shape
as the class register in lib/attendance, for the same reason. A dozen staff
over 22 school days is 22 writes a month and one read to see who is in today;
a document per person per day is 264 writes and a query to answer the same
question. The shape stays flat in headcount.

The document id is the date, so the day is a get by id with no query, no
index, and no ordering to maintain.

**`export function staffKey(email: string): string`**

Map keys are a slug of the email, not the email.

Firestore's set(merge:true) interprets a dot inside a map key as a field-path
separator, so `entries["asma.k@school.com"]` would silently create a nested
tree of empty maps instead of one entry. The real address is stored inside
the entry, where nothing parses it.

**`export function entryFrom(`**

Build the stored entry from a verdict.

The position is recorded whether or not it passed — a refused attempt is the
interesting one, and a register that only keeps successes cannot show the
office that someone tried to mark in from two suburbs away.

---

## `src/lib/staff.ts`

**`export function needsOwnerToEdit(before, nextEmail)`**

Which staff edits an owner has to make.

An edit needs an owner when the record already grants console access, or when it
changes the address the record signs in with. Everything else — a phone number,
a designation — stays open to staff, which is the point of having a staff list
at all.

This exists because of a real hole, not a theory. `updateStaff` rebuilds the
access roster from the record it writes, and it carried `role` and `access`
forward from the existing record while taking the email from the form. A staff
account could therefore edit the owner's row, point it at an address it
controlled, and be an owner on the next sign-in — without ever passing
`requireOwner`. The form was rendered on every row, so it needed no crafted
request.

The rule is a pure function so it is tested rather than asserted, and the server
enforces it: the page hiding the form is a courtesy, not the gate.

**`export function rosterFrom(members)`**

The access roster, derived from the staff list.

Only active records that hold access and have an email reach it. An inactive
owner grants nothing — otherwise marking someone inactive would read as removing
their access in the list while leaving them able to delete records.

---

## `src/lib/stageMeta.ts`

**`export function stageStyle(group: StageGroup, activeIndex = -1): StageStyle`**

Style for a stage.

`activeIndex` is the stage's position among the ACTIVE stages only, which is
what makes the middle of a pipeline deepen as it progresses. The first active
stage stays faint; everything after it is medium. Pass -1 for non-active
groups, where position is irrelevant.

**`export type StageView =`**

A stage resolved for rendering: configuration plus derived presentation.

Plain, serialisable data. Settings are server-only and async, so the server
resolves stages once and hands this to client components rather than letting
them reach for configuration they cannot read.

---

## `src/lib/storage.ts`

**`export async function streamObject(path: string): Promise<ReadableStream<Uint8Array>>`**

Read an object as a web stream, for proxying through an authenticated route.

Replaces signed URLs deliberately. A signed URL is a bearer token: whoever
holds it gets the file with no session, it survives in browser history, and
generating one needs iam.serviceAccounts.signBlob — a permission Application
Default Credentials on App Hosting may not hold, which would only surface as
a production 500. Streaming has none of those properties.

Existence is checked first so a missing object is a clean error rather than a
stream that fails midway through an already-committed 200 response.

**`export async function moveObject(from: string, to: string): Promise<void>`**

Move an object between prefixes.

Exists for the resource centre, where the prefix IS the permission: a file
shared publicly lives under `content/` and is world-readable, and one shared
with parents lives under `resources/` and is not. Un-publishing therefore has
to relocate the bytes. Leaving them behind would keep the old URL working for
anyone who ever saw it — the file would be "private" everywhere except where
it actually is.

**`export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;`**

A child's photograph is the most identifying thing this system stores, so it
gets a tighter cap than a news image: enough for a clear headshot, not enough
to be a route to filling the bucket from the admin console.

**`export async function uploadStudentPhoto(`**

Store a student's photo and return its path.

A path, never a URL, and deliberately not in a public prefix. There is no
address for this file that works without a session — see the note on
Student.photoPath. Content type comes from the sniffed bytes, so a file
claiming to be a PNG can never be served as something the browser executes.

The name is derived from the student id, not random, so replacing a photo
overwrites rather than accumulating one orphan per upload. Cache-busting is
the serving route's problem, not the object's.

**`export async function uploadStudentDocument(`**

Store a document against a child and return its path.

The object name is random, not derived from what the uploader called the
file. Two reasons: a guardian and the office can both upload "certificate.pdf"
without one silently replacing the other, and the bucket listing never
becomes a readable index of what each family submitted.

The display name lives in Firestore, where it belongs — see
src/lib/studentDocuments.ts.

**`export const ACCEPTED_RESOURCE_TYPES: Record<string, string> =`**

What staff may upload.

An allowlist, not a blocklist, and deliberately without HTML or SVG. Both are
documents a browser will execute, and a public resource is served from a URL
on Google's storage domain with the type we record — an uploaded page that
runs script is a real hazard, not a theoretical one. Everything here is inert
when opened, or opens in an application rather than the browser.

**`export function resourceStoragePath(id: string, fileName: string, isPublic: boolean): string`**

Where a resource's bytes belong, given who it is shared with.

`content/` is world-readable by the Storage rules; everything else is closed.
So this function, not a field, is what makes a file public — which means the
question "is this file reachable without a login" has exactly one answer, and
it is the one the storage rules enforce.

**`export function publicImagesSupported(): boolean`**

Can post images be published to the configured bucket?

Post images are the one thing here served straight from the bucket by URL,
rather than streamed through an authenticated route. That only works on a
Firebase-registered bucket with public reads — the `?alt=media` download
endpoint serves nothing else.

The bucket holding CVs and student documents is deliberately not that: it
sits in asia-south1 with public access prevention enforced, because those are
children's records and an applicant's CV, and nothing about them should be
reachable by URL. See docs/deploy-cloudrun-cloudflare.md §9.

So the two uses want opposite buckets, and this reports which one is
configured. Callers refuse the upload rather than storing an object and
handing back a URL that 404s — a broken image on the public news page with
no error anywhere is exactly the silent failure this codebase keeps removing.

**`export async function uploadPostImage(`**

Store a post image and return its public URL.

Content-Type comes from the sniffed bytes, not the upload, so a file claiming
to be a PNG can never be served as something the browser will execute.

Guarded by publicImagesSupported() at the call site — see above.

---

## `src/lib/studentDocuments.ts`

**`export const DOCUMENTS = "documents";`**

A child's documents — birth certificate, ID proof, medical papers.

This is the most sensitive thing the system holds. Not because any single
file is dramatic, but because of what a collection of them is: a child's
identity documents, uploaded by their parent, held by a school. Under DPDP
that is exactly the category that has to be handled deliberately rather than
as "just another upload".

Three rules follow from that, and they are enforced here rather than left to
each caller to remember:

  1. A path is stored, never a URL. The bucket is private with public access
     prevention enforced, so no address for these files works without a
     session, and no link can be forwarded to someone who should not have it.

  2. Reads go through an authenticated route on each side — admins through
     the console, guardians through the portal — and each side proves its own
     right to the file. This module never decides who is allowed; it only
     fetches, so a caller cannot accidentally inherit the wrong gate.

  3. Nothing is hard-deleted by a parent. Removing a document is an admin
     action, because a school may be required to hold what it was given.

── Retention is an open question, deliberately ─────────────────────────────

There is no TTL on this collection and no automatic deletion, because how
long a school must keep a child's records after they leave is a question for
the school and its obligations, not a default a developer should invent.
Recorded in docs/school-facts-needed.md. Until it is answered, documents are
kept, which is the recoverable direction.

**`export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;`**

8 MB. A photographed birth certificate from a phone lands around 3–5 MB, so
this clears the real case without making a parent-facing upload form a way to
fill the bucket.

**`const SIGNATURES: [string, number[]][] = [`**

Magic bytes for the accepted formats. The browser's declared type is
attacker-controlled and these files are streamed back to a logged-in admin's
browser, so the actual bytes decide.

**`export async function listDocuments(studentId: string): Promise<StudentDocument[]>`**

A child's documents, newest first.

No authorisation here on purpose — see rule 2 above. The admin console and
the parent portal each prove their own right to this child before calling.

---

## `src/lib/studentImport.ts`

**`export type ImportRow =`**

CSV import for existing students.

Until now a student could only be created from an admitted enquiry, which is
right for new families and useless for a school that already has 200 children
on its roll. Without this the CRM cannot be adopted at all — the alternative
is inventing 200 fake enquiries.

Parsing is pure and separate from writing, so the admin can see exactly what
will happen before anything is committed. A bulk import that half-succeeds
and reports "done" is worse than one that refuses.

**`export function splitCsvLine(line: string): string[]`**

Split one CSV line, honouring quoted fields.

Written out rather than pulled from a dependency because the input is a
spreadsheet export, not arbitrary RFC 4180: names contain commas
("Khan, Ayesha") and quotes get doubled. Those two cases are the whole
requirement, and both are covered by tests.

---

## `src/lib/students.ts`

**`export type Program = string;`**

Students.

Its own collection, deliberately — not a third `type` in `leads`.

`leads` already holds two shapes that disagree (`parentName` vs `name`,
`childAge` vs `role`), and every query there filters on `type` first. Adding
students would mean a third disjoint field set behind the same discriminator,
so every read would fetch fields it can't use and every index would carry
documents it can't match. A student also has a different lifecycle from a
lead: a lead ends, a student persists for years and accumulates attendance
and fees. Those are separate collections for the same reason.

A lead does not become a student — it produces one, and the lead stays as the
record of how the family arrived. `leadId` keeps that provenance.

**`export type Medical =`**

Medical notes are health data about a child — the most sensitive thing this
system stores, and under DPDP the most consequential to leak. Kept on the
student document rather than a subcollection on purpose: a teacher needs the
allergy line at the moment something goes wrong, and a second read is a
second thing that can fail when it matters most.

**`guardianPhones: string[];`**

Normalised guardian numbers, flat, for parent sign-in.

Duplicates what is inside `guardians[]` on purpose: Firestore cannot match
a field inside an array of objects, so without this every parent page load
would scan the whole roll. Written by the same code that writes guardians,
so the two cannot drift.

**`photoPath: string | null;`**

Object path of the child's photo, or null.

A path, never a URL. The file store is private with public access
prevention enforced, so there is no address this could be turned into that
would work without a session — which is the point. A photograph of a child
is not something that should be reachable by anyone holding a link.
Served by /admin/students/[id]/photo, behind the same gate as the record.

**`export const MAX_CLASS_SIZE = 60;`**

The children to show on a class register.

Only enrolled students: a withdrawn child must not keep appearing on a
register to be marked absent every day. Bounded because a preschool class is
bounded — if a section ever exceeds this, the section is the problem.

**`export function academicYearFor(date = new Date()): string`**

Academic year label for a date, e.g. "2026-27".

The Indian school year starts in June, so January to May belongs to the year
that began the previous June — a naive `getFullYear()` would file a child
admitted in March under the year that hasn't started yet.

**`export function nextAdmissionNumber(year: string, highest: string | null): string`**

Next admission number for a year, as `AF-2026-0001`.

Derived by reading the highest existing number for the year rather than kept
in a counter document: admissions happen a few times a day at most, so a
counter would be a hot document and a migration for no benefit. Zero-padded
so string ordering matches numeric ordering, which is what lets the list
paginate on this field.

ponytail: two admissions created in the same second could collide. The
caller runs this inside a transaction, which is what makes that safe.

**`export function guardianEmailsFrom(guardians: { email?: string | null }[]): string[]`**

Derive the flat, normalised phone list from a guardian array.

Single source for the duplication: anything that writes `guardians` calls
this for `guardianPhones`, so a guardian added without a login, or a login
surviving a removed guardian, cannot happen.

---

## `src/lib/taxonomy.ts`

**`export async function getPrograms(): Promise<string[]>`**

Configured lists, replacing the constants they were.

Server-only and async, because settings are. Client components receive the
resolved list as a prop rather than importing it — the same boundary the
pipeline migration established.

All of these are one cached settings read; calling several in a page costs
nothing extra.

**`export function pickFrom(list: string[], value: string | null | undefined): string | null`**

Validate a submitted value against a configured list.

Replaces the compile-time `z.enum(CONSTANT)` checks. Those could only ever
accept the values that shipped, so a school adding a program would have had
its own enquiry form rejected by its own server.

Falls back to the first configured value rather than erroring for optional
fields, and returns null when there is nothing sensible to pick.
