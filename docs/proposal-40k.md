# School Management System — Proposal

**Al Fitrah Pre School, Sarjapura** — Sompura Gate, Sarjapura, Bengaluru

| | |
|---|---|
| **Prepared for** | Al Fitrah Pre School, Sarjapura |
| **Prepared by** | DVLN Solutions LLP |
| **Date** | 21 August 2026 |
| **Basis** | Fixed price for the whole platform, stated against effort |
| **Total** | **₹45,000** for approximately 146 hours of work |
| **Validity** | 30 days from issue |

---

## 1. What is being built

One system, six parts:

1. A public website for the school.
2. A CRM holding every student and every teacher.
3. Attendance marking, daily — students by their class teacher, staff by themselves
   with a location stamp.
4. Fee setup, collection through SBI Collect, and receipts.
5. A permanent registration ID per student, with the full record attached to it.
6. A parent portal, where a guardian sees their own child's attendance, documents and
   fees.

Sized for the current roll of **30 students**. The design does not change at 300; only
the hosting plan would.

**A substantial part of this is already built and running.** Section 2 separates what
is delivered from what remains, so the school can see both what it already has and what
it is still waiting for.

---

## 2. Hours and price

The quote is for the platform as a whole — everything below, built and remaining,
for one price. Less than half the effort remains; the larger share is already built
and running.

### 2.1 Already delivered and running

| # | Workstream | Hours |
|---|---|---|
| 1 | Website — 13 public pages, admissions enquiry, SEO | 16 |
| 2 | Admissions CRM — leads, pipeline, follow-up reminders, capture forms | 18 |
| 3 | Student register — records, registration ID, history, CSV import | 12 |
| 4 | Student attendance — daily registers, reports, exports | 8 |
| 5 | Fees — structures, invoices, receipts, append-only ledger | 12 |
| 6 | Parent portal foundation — sign-in, children, balance, payment history | 6 |
| 7 | News CMS, insights, audit log, settings, staff roles | 8 |
| | **Delivered** | **80** |

### 2.2 Remaining

| # | Workstream | Hours |
|---|---|---|
| 8 | Teacher / staff CRM — records, roles, access | 10 |
| 9 | Staff attendance — self check-in and check-out with a location stamp | 10 |
| 10 | Parent portal completion — attendance, documents, fee payment | 14 |
| 11 | Fee payment — SBI Collect import, plus Razorpay for instant confirmation | 16 |
| 12 | Move to AWS and Cloudflare, cutover | 10 |
| 13 | Data import, training, handover | 6 |
| | **Remaining** | **66** |

### 2.3 The number

| | |
|---|---|
| Total effort | **146 hours** |
| Total fee | **₹45,000** |
| Works out to | ~₹308 per hour |

Fixed price: if a workstream runs over its estimate, the school pays the quoted
fee, not the extra hours. Exclusive of GST where applicable.

**Payment**: ₹18,000 on signing (covering what is already delivered), ₹14,000 when
workstreams 8–10 are accepted, ₹13,000 on handover. Invoices from DVLN Solutions LLP,
payable in 15 days.

---

## 3. What each workstream delivers

Workstreams 1–7 are built and running. 8–13 remain.

### 1 — Website (16 h) · delivered

Home, About, Programmes, Admissions, Campus Life, Careers, Contact, FAQ, News,
Syllabus, Parent Resources, Privacy. Mobile first. An admissions enquiry form that
writes straight into the CRM — no email forwarding, no re-typing. Search-engine basics:
sitemap, page titles, structured data for a local school.

### 2 — Admissions CRM (18 h) · delivered

Every enquiry becomes a lead with a stage, an owner and a note history. Duplicate
detection so the same parent phoning twice does not become two records. Daily follow-up
reminders by email so nobody is forgotten. Enquiry, application and referral capture
forms all feed the same inbox. Export to CSV.

### 3 — Student register (12 h) · delivered

One record per student: name, date of birth, class and section, guardians with phone
numbers, address, admission date, status. Search by name, registration ID, class or
guardian phone. Bulk import from the existing register via CSV.

### 4 — Student attendance (8 h) · delivered

Class register on screen: mark the whole class in one pass. Stamped with who marked it
and when. Monthly attendance per student and per class, absence list for the day,
export to CSV for any date range.

### 5 — Fees (12 h) · delivered

Fee structures per class (tuition, admission, transport, other heads), term or monthly.
Invoices against a student, payments against an invoice. Receipt with a serial number,
printable and downloadable. An **append-only ledger**: a wrong entry is reversed with a
visible correcting entry, never edited away. Outstanding-dues list, sorted by amount
and days overdue.

### 6 — Parent portal foundation (6 h) · delivered

Guardian sign-in, the list of their own children, each child's balance and payment
history. A parent can only ever reach their own children — enforced at the data layer,
not just on the page.

### 7 — News CMS, insights, audit log, settings (8 h) · delivered

School news and events published from the admin console. A dashboard of enquiry and
admission numbers. An audit log recording who changed what. Settings for fee heads,
class sections, attendance statuses and staff roles, so the school can adjust these
itself without a developer.

### 8 — Teacher / staff CRM (10 h)

One record per staff member: name, role, contact, joining date, class assignment,
documents. Login accounts with three levels — Principal (everything), Office (students,
fees, attendance), Teacher (own class attendance only). A teacher cannot see fee data.

### 9 — Staff attendance with location (10 h)

Teachers mark their own check-in and check-out from their phone. Each mark records the
time from the server and the location from the phone, and the system works out how far
that is from the campus.

Two things worth being clear about, because they shape how the school should read the
register:

- **The location is a note, not a proof.** A phone's reported position can be
  overridden, so this records where a check-in came from — it does not verify that a
  teacher was physically present. For a staff room of under a dozen people, that is the
  right level.
- **A poor signal is not treated as absence.** Indoors, a phone is routinely accurate
  only to 50–100 metres, which is exactly where a teacher stands while marking. The
  system widens its allowance by whatever accuracy the phone reports, and a check-in
  outside the campus boundary is **flagged for the Principal, not blocked**. Blocking
  would lock out a teacher standing inside the school with a weak signal.

Location is captured only at the moment of marking. There is no background or
continuous tracking, and none is possible with this design.

### 10 — Parent portal completion (14 h)

On top of workstream 6: the child's attendance record, documents to view and download,
what fees are due, and a way to pay them. Downloads go through an authenticated route,
so a document link cannot be forwarded to somebody who is not a guardian.

### 11 — Fee payment (16 h)

Both rails, described in Section 5: the SBI Collect reconciliation import, and Razorpay
for parents who want the payment confirmed instantly.

### 12 — Move to AWS and Cloudflare (10 h)

Set up in accounts owned by the school, with daily automated backups, and cut over from
the current hosting with a tested rollback. See Section 6.

### 13 — Data import, training, handover (6 h)

Existing student data imported and reconciled. Two training sessions — one for office
staff, one for teachers. A written operations manual. Source code handed over.

---

## 4. Registration ID and student history

Every student gets one ID at admission:

```
AF-SJP-26-014
 │   │   │   └── serial within the year
 │   │   └────── admission year (2026)
 │   └────────── branch (Sarjapura)
 └────────────── Al Fitrah
```

Rules:

- Allocated once, at admission. Never changes — not on class promotion, not on
  re-admission after a gap.
- Never reused, even after a student leaves.
- Printed on every receipt, report and letter.
- The parent's handle for the portal.

Everything hangs off this ID and stays for as long as the school keeps the record:

| Attached to the ID | Retained |
|---|---|
| Admission form and enrolment details | Permanently |
| Class and section history, year by year | Permanently |
| Daily attendance | Permanently |
| Every invoice, payment and receipt | Permanently |
| Uploaded documents (birth certificate, photo, ID proof) | Permanently |
| Change log — who edited what, when | Permanently |

A student who leaves is marked *Left*. The record is not deleted; it stops appearing in
active lists and remains fully searchable by ID.

---

## 5. Online fee collection

Two rails, both wired in, because they fail in opposite directions and the school
should not have to pick one and live with its weakness.

| | SBI Collect | Razorpay |
|---|---|---|
| Where the money lands | Straight into the school's SBI account | Settles to the same account in about two working days |
| Cost on UPI / RuPay debit | Nil | Nil |
| Cost on cards and net banking | Nil to the school | ~2% + GST |
| Confirmation in this system | Weekly import | Instant |
| Receipt to the parent | After the import runs | Automatic, within seconds |

### 5.1 Why both

**SBI Collect** is the school's own bank, costs the school nothing on any mode, and
puts money in the account with nobody in between. Its weakness is that it cannot tell
this system anything — see 5.2.

**Razorpay** confirms the payment the moment it happens and emails the receipt without
anyone touching it. Its weakness is a fee on cards and net banking, and a two-day
settlement.

In practice most preschool parents pay by UPI, where **both are free** — the merchant
discount rate on UPI and RuPay debit is set to zero by law (Finance Act 2020), for
every provider in India, not as a concession by either company. So for the common case
Razorpay costs the school nothing and simply works better. The ~2% applies only to the
minority who reach for a credit card, and net banking carries a similar charge — it is
not card-only.

Exact published rates change; **confirm both at the time of setup** — SBI at the
branch, Razorpay on their pricing page. They are not quoted here as fixed numbers.

**Recommendation: make Razorpay the default button in the parent portal, and keep SBI
Collect as the alternative** for parents who prefer paying through the bank directly.
The school can turn either off without a code change.

### 5.2 The SBI Collect limitation, and how it is handled

SBI Collect is a hosted payment page, not a programming interface. It cannot notify
this system that a parent has paid. So reconciliation is built instead, and this is
where the registration ID earns its keep:

1. The school's SBI Collect form is configured with **Registration ID as a mandatory
   field** (plus student name, class, fee head, month or term). SBI allows the
   institution to define these fields when the Collect page is created.
2. A parent pays and gets an SBI reference number.
3. Once a week — or daily during fee season — the office downloads the transaction
   report from the SBI Collect merchant login.
4. That file is uploaded here. Every row is matched to a student by registration ID and
   to an open invoice by amount and fee head, then posted to the ledger with the SBI
   reference number stored against it.
5. Anything that does not match cleanly — wrong ID, part payment, a duplicate — lands
   in an exceptions list for a person to decide. Nothing is guessed and nothing posts
   silently.

Roughly ten minutes of office work a week at 30 students.

### 5.3 What the parent sees

A payment made through **Razorpay** shows as paid immediately, with the receipt in the
portal and in the parent's inbox.

A payment made through **SBI Collect** shows as *awaiting confirmation* until the next
import runs, which can be up to a week. The portal says so explicitly rather than
continuing to show the fee as simply due — a parent who has just paid and sees an
unchanged balance will telephone the office, and that call is the thing worth designing
out.

This gap is the honest cost of the free rail, and it is the reason Razorpay is worth
having alongside it rather than instead of it.

---

## 6. Running costs — AWS and Cloudflare

Borne by the school, billed directly to the school's own accounts. Nothing routes
through DVLN Solutions LLP. Converted at ₹88 = $1.

### 6.1 Recommended at 30 students

| Service | What it is | $/month | ₹/month |
|---|---|---|---|
| AWS Lightsail — 2 GB, 2 vCPU, 60 GB SSD | Runs the application and database | 12.00 | 1,056 |
| Lightsail automatic snapshots | Daily backup, 7-day retention | 3.00 | 264 |
| Amazon S3 — 10 GB | Student photos and documents | 0.30 | 26 |
| Amazon SES | Receipts and notices by email, ~2,000/month | 0.20 | 18 |
| Cloudflare Free | DNS, CDN, SSL, firewall, bot protection | 0.00 | 0 |
| | **Total** | **15.50** | **≈ ₹1,364** |

**≈ ₹16,400 per year.** Plus the domain, roughly ₹1,200 per year.

Cloudflare's free plan is not a trial — DNS, unlimited CDN bandwidth, the SSL
certificate, the managed firewall rules and bot protection are all free permanently. At
this size the school pays Cloudflare nothing.

### 6.2 If the school grows or wants more headroom

| Service | $/month | ₹/month |
|---|---|---|
| AWS Lightsail — 4 GB, 2 vCPU | 24.00 | 2,112 |
| Lightsail managed PostgreSQL — 1 GB, with standby | 15.00 | 1,320 |
| Snapshots | 4.00 | 352 |
| Amazon S3 — 25 GB | 0.60 | 53 |
| Amazon SES | 0.20 | 18 |
| Cloudflare Pro — image optimisation, custom firewall rules, analytics | 20.00 | 1,760 |
| | **Total** | **63.80** | **≈ ₹5,615** |

Not needed now. Listed so the ceiling is visible before it is hit. Moving from 6.1 to
6.2 is a plan change in the AWS console, not a rebuild.

### 6.3 Charges that depend on usage

| Item | Charge | At 30 students |
|---|---|---|
| SBI Collect | Nil to the school, any mode | ₹0 |
| Razorpay — UPI and RuPay debit | Nil | ₹0 |
| Razorpay — cards and net banking | ~2% + GST | Only on fees actually paid that way |
| SMS, if enabled later | ~₹0.20 per message | Optional; email is the default and near-free |

Cash, direct UPI and SBI Collect cost the school nothing at all. Razorpay adds a charge
only on the share of fees paid by card or net banking — if every parent pays by UPI,
the monthly bill is unchanged.

### 6.4 One line on the current setup

The system runs today on Google Firebase, inside its free tier, at **₹0/month**. The
AWS and Cloudflare figures above are what it costs to move onto infrastructure the
school controls outright — a real bill replacing a free one, buying control and
portability rather than features. The 12 hours in workstream 6 cover that setup. The
school can also stay on Firebase and spend nothing; the software is the same either way.

---

## 7. Timeline

Workstreams 1–7 are already delivered. The remaining 66 hours:

| Weeks | Work |
|---|---|
| 1 | Teacher / staff CRM, staff attendance with location, fee payment — SBI Collect import and Razorpay |
| 2 | Parent portal completion, move to AWS and Cloudflare, cutover |
| 3 | Data import, training, handover |

Two to three calendar weeks, full-time. Handover inside three weeks of signing.

---

## 8. Not included

Stated plainly so there is no argument later:

- Report cards, marks, exams, academic records
- Timetable generation
- Library and transport modules
- WhatsApp messaging (Meta charges per conversation)
- A mobile app — the system is a website that works on a phone, including staff check-in
- Biometric or RFID attendance hardware — staff attendance uses the phone they already carry
- Content writing and photography for the website

Any of these can be quoted separately at the same ₹500/hour.

---

## 9. Assumptions

1. The school provides content — text, photos, fee structure, class list — within the
   first week.
2. AWS, Cloudflare and domain accounts are opened in the school's name. The school
   owns every account and every rupee of infrastructure spend.
3. The school opens SBI Collect through its own SBI branch and configures the payment
   form with Registration ID as a mandatory field. Office staff are given the Collect
   merchant login so transaction reports can be downloaded.
4. The school opens a Razorpay merchant account in its own name and completes KYC.
   Settlement is to the school's SBI account.
5. Staff are told in writing, before the feature is switched on, that marking their own
   attendance records a location at that moment. This is a condition of building it,
   not a suggestion: it is their personal data, and the school is the one collecting it.
6. One person at the school is the point of contact for decisions and approvals.
7. Existing student data arrives as a spreadsheet in any consistent format.
8. Scope is what is listed in Section 3. Additions are quoted before they are built.

---

## 10. After handover

| Option | Fee | Covers |
|---|---|---|
| Warranty | Free, 60 days | Anything that does not work as specified |
| Support retainer | ₹1,500/month | 8 hours of changes, security updates, backup checks, response within one working day |
| Ad-hoc work | ₹500/hour | Billed on actual hours, no minimum, no retainer required |

On final payment the source code and all data belong to Al Fitrah Pre School,
Sarjapura. Every third-party account is already in the school's name, so nothing
depends on the developer to keep running.

---

*DVLN Solutions LLP · Confidential — commercial in confidence*
