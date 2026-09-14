# Using the Al Fitrah console

For the school office. No technical knowledge assumed.

Everything below happens at **www.alfitrahsarjapura.in/admin**, signed in with
the Google account the school gave you. If the page asks you to sign in again,
that is normal — sessions last five days.

---

## Day one: four things, in this order

The console will not work properly until these are done, and they only need
doing once. Order matters: classes must exist before children can be put in
them, and children must exist before attendance or fees mean anything.

### 1. Name your classes — **Settings → Class sections**

The system ships with **no class names on purpose**. It does not guess, because
a register that opens on a class the school does not have is worse than one that
says it has nothing to open.

Type the names the school actually uses — whatever you write on the door. If
your Junior KG is split into two, name both.

### 2. Check your programmes — **Settings → Programmes**

Pre-KG, Junior KG and Senior KG are already there, taken from the website. Edit
them if the school's structure differs.

### 3. Add your staff — **Staff**

Add every teacher and office member. Name and designation are enough to start.

**Console access is separate and deliberate.** Adding someone to the staff list
does *not* let them sign in. An owner has to switch access on for that person,
and they need a **Google email address** — sign-in is by Google account, so a
Gmail or a Google Workspace address, not any address at all.

Give **one person owner**. Until somebody is an owner, everyone who can sign in
can delete anything. The moment you name the first owner, everyone else becomes
staff, who can do the daily work but cannot delete records.

### 4. Load your children — **Students → Import**

For a whole class at once, prepare a spreadsheet and save it as CSV. The import
page lists the columns it accepts and which are required; it shows you what it
will do **before** anything is saved, including the rows it cannot read and why.

Only three things are required per child: **first name, guardian name, guardian
phone**. Everything else can be filled in later.

> **The guardian's phone number is how that family signs in to the parent
> portal.** Enter it as ten digits. The system will accept it written with
> spaces, `+91`, or a leading zero, and will store it correctly either way — but
> it must be the number the parent actually has.

For one child at a time, use **Students → Add student** instead.

---

## Every day

### Marking attendance — **Attendance**

Pick the class. Everybody starts marked present, so you only tap the children
who are **not** — absent, late, on leave. The count at the top tells you how
many are away as you go. Press **Save** at the bottom.

Marking the same day again corrects it. It does not create a second register.

The month figure on each child turns **red below 75%**, which is the number
worth a phone call home.

### Your own check-in — **Attendance → Check in**

One tap, and it records where you were. If you are away from the campus it still
records the check-in and notes the distance rather than refusing it — the
record is honest, and the office can see the rest.

### New enquiries — **Leads**

Every enquiry from the website arrives here by itself. Walk-ins and phone calls
you add with **New lead**.

Two views of the same thing:

- **List** — what is on your desk. Search, filters, and the *Needs attention*
  view: overdue follow-ups and new enquiries nobody has touched in two days.
- **Board** — where everyone is in the pipeline, at a glance.

On any lead you can call or WhatsApp the parent directly. The WhatsApp message
comes pre-written; you can edit it before sending.

**Always set a follow-up date.** It is the only thing that puts the family back
in front of you. A digest of everything due goes out each morning at 9.

When a child is admitted, use **Convert to student** on the lead. The enquiry
stays in the system as the record of how that family found you.

---

## Money — **Fees**

### Set the price list once — **Fees → Fee structures**

Create one structure per programme or class, with the amount for the year. Then
**Apply to a class** to put it on every child in that class at once.

Applying is careful with what it already has:

- A child with no fee yet **gets** it.
- A child already on this fee gets the **corrected** amount, keeping any
  concession they have.
- A child whose fee was typed in by hand is **skipped**, so a bulk action can
  never quietly overwrite a special arrangement.

### Recording a payment

On the child's record, **Fees → Record payment**. Enter the amount, how it was
paid, and the date if it was not today. A receipt number is generated.

**Payments are never edited or deleted.** A mistake is corrected by recording a
negative amount — a refund or an adjustment — so the history always shows what
actually happened. This is deliberate: it is the one place where losing a record
cannot be undone.

### Who to chase — **Fees** (main page)

Families are grouped by what to do about them, not just by what they owe:

| Group | Meaning |
|---|---|
| **Promise broken** | They named a date and it has passed. Most recoverable money, easiest call. |
| **Overdue** | Past the due date, no promise made. |
| **Due this week** | A nudge now costs less than a chase later. |
| **Promised to pay** | They named a future date. **Leave them alone until it passes.** |
| **No due date set** | Owing, but nothing can tell you when to follow up. |

When a parent says "I will pay on the 20th", record it with **Log promise**.
That stops the reminders until the 20th. Chasing someone three days after they
told you when they would pay is how a school teaches parents to ignore it.

---

## What parents see — the portal

Parents sign in at **/portal** with their **email** if the school has one for
them, or a **code sent to their phone** if not. They see only their own
children, and that is re-checked on every page — not stored in their browser.

They can see:

- fees: total, paid, balance, and every receipt
- attendance for the month, with the days marked
- documents the school has shared with them, and they can upload their own

They **cannot** change anything.

If a parent says they cannot sign in, check the phone number or email on the
child's record first. That is almost always it.

---

## Sharing files — **Resources**

Newsletters, forms, calendars, worksheets. Upload once, choose who it is for:

- **Anyone** — appears on the public website's downloads page
- **Parents** — visible in the portal to signed-in parents
- **Staff only** — visible only in this console

Changing who a file is for actually moves the file, so a document you un-share
stops being reachable immediately. A file shared by WhatsApp cannot be
un-shared; one shared here can.

---

## The website — **Website**

News and events. What you publish appears on the public site within the hour;
unpublishing removes it. Photographs can be attached to a post.

Everything else on the public site — programmes, fees copy, gallery, contact
details — is changed by the developer, because it changes once a year rather
than weekly.

---

## Who did what — **Activity**

Every change of consequence is recorded: who moved a lead, who recorded a
payment, who opened a child's documents, who was given console access. You can
filter by person or by record.

This exists because the school holds children's data and has to be able to
answer that question. It is not there to watch staff; it is there so the school
can prove what happened.

---

## The rules worth remembering

1. **The phone number on a guardian is their key to the portal.** Wrong number,
   no access.
2. **Payments are never edited.** Correct with a negative entry.
3. **A promise to pay stops the chasing.** Record it.
4. **Access and employment are separate.** Marking someone inactive removes
   their sign-in; removing their access does not remove their record.
5. **Nothing here can be deleted by accident by a staff account.** Only owners
   delete. That is why naming an owner matters.

---

## When something looks wrong

- **A parent cannot sign in** — check the phone/email on the child's record.
- **A class is missing from a dropdown** — Settings → Class sections.
- **Attendance opens on the wrong class** — pick the class again; it remembers
  the last one used on that device.
- **Enquiry emails are not arriving** — this is a known open item; the school's
  email domain still needs verifying with the mail provider. Tell the developer.
- **Anything else** — note what you did, what you expected, and what happened,
  and send all three. "It is broken" cannot be fixed; those three lines usually
  can.
