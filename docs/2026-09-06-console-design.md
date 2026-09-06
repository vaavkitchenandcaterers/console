# Console — UI/UX Design Brief

**Date:** 2026-09-06
**Status:** Draft for review — not yet an implementation plan
**Feature:** The internal console: a mobile-first quote studio backed by a real server, plus the deal pipeline the current tool is missing.

Supersedes the operating model of `site/studio/` (see `site/docs/2026-07-11-quotation-studio-design.md` and `site/docs/2026-07-12-studio-requests-design.md`). Stack is deliberately unchosen — ADR-0002 in `docs/decisions.md` remains open.

---

## 0. The read

Grounded in the existing `site/studio/` and the three live quotes in `data/vaav-quotes-backup.json`.

| Question | Answer | Evidence |
|---|---|---|
| **Primary user** | Surendhar, owner-operator. One person doing intake, pricing, sending, follow-up. | One shared passcode gate, no accounts, no author field, manual quote numbering. |
| **Primary goal** | Turn an enquiry into a priced, branded quotation fast — and never lose track of it. | Enquiries are comparison-shopped in hours; a mistyped rate on 1,200 guests is a ₹60,000 error. |
| **Key journey** | Enquiry → quote → price → send → **follow up → won/lost**. The bolded half does not exist. | `status` is only `new \| quoted`. Nothing tracks a quote after Send. |
| **Constraints** | No backend, and `connect-src 'self'` forbids one; all data in one browser; passcode is not auth; 66 set menus must carry over; existing quotes must migrate. | `studio/index.html` CSP; `localStorage` keys `quotes/items/settings/requests`; `menu-data.js`; sequence at `VAAV-2026-016`. |
| **UX risks** | Data loss · pricing error · lossy paste intake · silent pipeline death · customer PII behind a shared passcode · builder complexity at 375px. | Manual JSON backup; `guests × rate` unvalidated; duplicate pastes allowed by design. |

> **The risk that outranks every feature.** The business's entire quote history lives in one browser profile. Clearing site data destroys it. Server-side persistence is not a v1 feature — it is the reason v1 exists.

### Decisions taken

Mobile-first · single operator · web-form intake with paste retained · studio **and** pipeline.

---

## 1. Information architecture

### Object model

| Object | What it is | Key fields |
|---|---|---|
| **Enquiry** | The thread. Created by the site's menu-share form, or pasted. Carries the stage through its life. | `stage`, customer, occasion, date, guests, venue, `followUpOn`, `source` |
| **Quote** | A priced document attached to an enquiry. Numbered on first save. Versioned, never silently overwritten after send. | `number`, `version`, `menus[]`, `charges[]`, `sentAt` |
| **Menu set** | One of the 66 catalogue sets — Tiffin, Lunch, Dinner — with its dish groups. | `name`, `label`, `groups[]` |
| **Rate card** | Per-set default rates, so pricing starts from a known number rather than blank. | `setId`, `defaultRate`, `updatedAt` |

The studio keeps *requests* and *quotes* as separate lists joined only by a `fromRequest` pointer. Collapsing them into one **Enquiry** that owns its quotes is what makes a pipeline possible — a stage belongs to the thread, not to the document.

### Navigation — bottom tab bar, four tabs

Four is the ceiling for comfortable thumb reach at 375px.

| Tab | Answers | Contains |
|---|---|---|
| **Today** | "What needs me right now?" | New enquiries, follow-ups due, events in the next 7 days |
| **Pipeline** | "Where does everything stand?" | All enquiries by stage, filter and search |
| **Menus** | "What do we serve, at what rate?" | 66 sets by category, rate card |
| **More** | "Settings and safety." | Business details, export, sync status, sign out |

**Not tabs:** quote builder, quote preview, enquiry detail. These are pushed full-screen views — modes, not places.

---

## 2. User flows

### Flow A — the spine

```
New → Quoting → Sent → Won
                     ↘ Lost
```

Five stages, no more. Every extra stage is a decision the operator must make on every record, and a solo operator will not maintain a seven-stage funnel. **Sent** is the only stage carrying a mandatory `followUpOn` — that single field is what stops deals dying silently.

### Flow B — intake, two doors

```
Site menu-share form ──┐
                       ├── review card ── Enquiry (stage: New)
Paste (phone/walk-in) ─┘
```

`request-parse.js` and its tests stay. Form intake handles the common path; paste still covers the enquiry that arrives as a phone call. Deleting it would remove the only route for offline enquiries.

### Flow C — pricing

```
Open draft (menus + guests pre-filled)
  → set rate (rate card supplies default)
  → review pinned total (outliers flagged)
  → confirm & send (total restated)
```

---

## 3. Required screens

| # | Screen | Why it must exist | Priority |
|---|---|---|---|
| S1 | Unlock | Real auth replacing the client-side passcode, in front of customer PII | P0 |
| S2 | Today | The attention queue; the only screen answering "what now?" | P0 |
| S3 | Pipeline | Stage overview — closes the post-send gap | P0 |
| S4 | Enquiry detail | The thread: original message, stage, follow-ups, quotes | P0 |
| S5 | Quote builder | The core task; hardest mobile problem in the product | P0 |
| S6 | Quote preview | What the customer will see, before it is sent | P0 |
| S7 | Send | The confirmation checkpoint on a ₹6L document | P0 |
| S8 | Menus & rates | Catalogue browse plus the rate card | P1 |
| S9 | More / settings | Business details, export, sync status, sign out | P1 |

---

## 4. Screen specifications

### S2 — Today · `/`

```
1  Greeting + date
2  ATTENTION BAND      new enquiries · follow-ups due (count chips)
3  Needs quoting       enquiry cards, newest first
4  Follow up today     sent quotes past followUpOn
5  This week           confirmed events, date-ordered
6  Sync state          "All saved · 2 min ago"
—  Bottom tab bar
```

- **Goal** — know what needs attention without reading a list.
- **Content** — only actionable items. A quoted enquiry not yet due for follow-up appears nowhere here; it lives in Pipeline. Today is a queue, not a dashboard.
- **Action** — tap a card → enquiry detail; or **Quote it** directly from a New card.
- **Feedback** — counts decrement live; the band empties to "Nothing needs you today."
- **Next** — enquiry detail (S4), or straight into the builder (S5).

Primary: **Quote it**. Secondary: open enquiry · snooze follow-up · new quote.

### S5 — Quote builder · `/enquiry/:id/quote`

The hardest screen. Today it is a two-pane builder beside a live preview, which cannot survive at 375px. Mobile-first means a **stepped single column with the total pinned**, and preview promoted to its own screen rather than shrunk to a sliver.

```
‹ Back    VAAV-2026-017   Draft · saving…
STEP 2 OF 4  Menus        (Customer · Menus · Charges · Review)
Dinner 5                  Sweet, Starter, Main Course — 17 dishes
Guests 800 · Rate ₹450    Line total ₹3,60,000
+ Add menu set
…                         dish groups collapsed by default
TOTAL ₹3,60,000           800 guests · 1 menu      ← pinned
Preview →                                          ← pinned primary
```

- Four steps, not one long form. Each fits a 375×667 screen without scrolling past the fold.
- The total is **pinned above the thumb**, never scrolled away. It is the single number preventing a ₹60,000 error.
- Dish groups **collapse by default** — Dinner 5 carries 17 dishes; expanded, one card would fill three screens. The operator prices sets, not dishes.
- Rate and guests are the only two fields that matter: large numeric inputs, line total recomputing as you type.

- **Goal** — put a defensible price on this event without a mistake.
- **Content** — menus carried from the enquiry, guests pre-filled, rate seeded from the rate card. Charges optional, collapsed.
- **Action** — adjust guests and rate; add/remove a set; add a charge; advance a step.
- **Feedback** — line total updates on input via `aria-live="polite"`; autosave shows Saving/Saved; an out-of-range rate raises an inline warning.
- **Next** — preview (S6).

Primary: **Preview**. Secondary: add menu set · add charge · save and close.

> **Pricing guardrail.** When `rate` falls outside the historical band for the category, or `guests` exceeds 1,500, show an inline caution naming the comparison: *"₹450 is below the last five Dinner quotes (₹480–₹620)."* It informs, never blocks — the operator may genuinely be discounting.

### S6 — Quote preview · `/quote/:number/preview`

```
1  Back to builder
2  Document at true proportions, pinch-zoomable
3  Page indicator when it runs past one page
—  Sticky footer   Edit | Send
```

- **Goal** — see exactly what the customer sees before it goes.
- **Content** — letterhead, customer, occasion and date, menus with dish groups, per-line totals, grand total, terms.
- **Action** — scroll, zoom, back to edit, or proceed.
- **Feedback** — rendering state while the document builds; number appears in the header once assigned.
- **Next** — send (S7) or back.

Primary: **Send**. Secondary: edit · download PDF.

### S7 — Send · `/quote/:number/send`

```
1  Restated summary   "Karthik & Divya · Wedding reception · 20 Sep"
2  THE NUMBER         ₹6,24,000 · 1,200 × ₹520
3  Channel            WhatsApp (default) · copy link · download
4  Follow-up date     pre-filled +3 days, editable — REQUIRED
—  Sticky footer      Send quotation
```

- **Goal** — send the right number to the right person, and not lose the thread.
- **Content** — total restated as `guests × rate` so the arithmetic is visible one last time.
- **Action** — pick channel, confirm follow-up date, send.
- **Feedback** — success naming both: "VAAV-2026-017 sent. Follow up on 23 Sep."
- **Next** — back to Today; the enquiry is **Sent** and resurfaces on its follow-up date.

Primary: **Send quotation**. Secondary: change channel · change follow-up · back.

> **Why the follow-up date is required.** It is the one field that fixes the diagnosed failure. Optional on a screen the operator is rushing through means skipped, and the deal goes dark exactly as today. Pre-filling +3 days makes it one tap to accept.

### S4 — Enquiry detail · `/enquiry/:id`

```
1  Customer + stage chip
2  Event facts             occasion · date · guests · venue
3  Quotes on this enquiry  number, version, total, sent date
4  Follow-up               due date, mark done, reschedule
5  Original message        collapsed; expandable, verbatim
6  Stage control           Won / Lost / reopen
—  Sticky footer           Quote it  (or View quote)
```

- **Goal** — see the whole thread and decide the next move.
- **Content** — everything about one conversation, including the verbatim original: the parser is imperfect and raw text is the source of truth.
- **Action** — create/open a quote; mark won or lost; complete or reschedule a follow-up.
- **Feedback** — stage chip changes colour and label; Won asks for the confirmed date, Lost asks for a reason from a short list.
- **Next** — builder (S5), or back to Pipeline with the stage updated.

Primary: **Quote it / View quote**. Secondary: mark won · mark lost · reschedule · call · WhatsApp.

### S3 — Pipeline · `/pipeline`

```
1  Search
2  Stage filter    segmented: All · New · Quoting · Sent · Won · Lost
3  Value summary   "8 open · ₹18,40,000 quoted"
4  Grouped list    stage headers, cards within
—  Bottom tab bar
```

- **Goal** — see where everything stands, and find one specific enquiry.
- **Content** — every enquiry as a card: customer, occasion, date, value, stage, overdue follow-up.
- **Action** — filter by stage, search by name, open a card.
- **Feedback** — filter chips show counts; overdue follow-ups carry a kumkum dot.
- **Next** — enquiry detail (S4).

Primary: **Open enquiry**. Secondary: filter · search · new enquiry.

**A list, not a kanban board.** Horizontal drag-between-columns is a desktop metaphor that fails at 375px and offers a solo operator nothing a stage filter does not.

### S1 — Unlock · `/signin`

- **Goal** — get in quickly on a personal phone, without leaving customer data behind a guessable passcode.
- **Content** — Vaav mark, one credential field, unlock. Nothing else.
- **Action** — sign in; biometric unlock on a trusted device for return visits.
- **Feedback** — inline error naming the fix; rate-limited after repeated failures, with the wait stated.
- **Next** — Today (S2).

> **Not a passcode.** The current gate is JavaScript on a public URL — obfuscation, not security — standing in front of customer names, phone numbers, venues and event dates. Server-side sessions are the minimum bar; a long-lived session plus biometric re-entry keeps it as fast as the passcode felt.

### S8 — Menus & rates · `/menus`

```
1  Category tabs   Tiffin · Lunch · Dinner
2  Set list        name, dish count, current default rate
3  Set detail      dish groups, rate history
—  Bottom tab bar
```

- **Goal** — check what a set contains, and keep default rates current.
- **Content** — all 66 sets from `menu-data.js`, grouped by the three existing categories.
- **Action** — browse, search a dish, edit a default rate.
- **Feedback** — rate change confirms inline and states it affects new quotes only.
- **Next** — back, or start a quote from a set.

Primary: **Edit default rate**. Secondary: search dish · quote from this set.

> Editing a default must never reprice a sent quote. Quotes store the rate used; the rate card only seeds new ones. This is also what makes the S5 outlier warning possible.

---

## 5. Primary and secondary actions

One primary per screen, thumb-reachable and pinned. Everything else is secondary and may scroll.

| Screen | Primary | Secondary |
|---|---|---|
| S1 Unlock | Sign in | Biometric unlock |
| S2 Today | Quote it | Open enquiry · snooze · new quote |
| S3 Pipeline | Open enquiry | Filter · search · new enquiry |
| S4 Enquiry | Quote it / View quote | Mark won · mark lost · reschedule · call · WhatsApp |
| S5 Builder | Preview | Add set · add charge · save and close |
| S6 Preview | Send | Edit · download PDF |
| S7 Send | Send quotation | Change channel · change follow-up · back |
| S8 Menus | Edit default rate | Search dish · quote from set |
| S9 More | Export backup | Business details · sync status · sign out |

---

## 6. Component requirements

Thirteen components cover all nine screens, built on the existing tokens in `site/style.css`. This is not a new design system.

| Component | Requirement |
|---|---|
| `TabBar` | Four items, fixed bottom, safe-area inset, `aria-current="page"` on the active tab |
| `EnquiryCard` | Customer, occasion, date, value, stage chip, overdue dot; whole card is one tap target |
| `StageChip` | Five states with distinct colour **and** label — never colour alone |
| `MenuCard` | Set name, collapsed dish groups, guests and rate inputs, live line total |
| `MoneyInput` | `inputmode="numeric"`, ₹ prefix, Indian digit grouping on blur, no spinner |
| `TotalBar` | Pinned above the tab bar; grand total plus the arithmetic that produced it; `aria-live="polite"` |
| `StepHeader` | "Step 2 of 4" with named steps; tappable back, never forward past an incomplete step |
| `SaveIndicator` | Saving / Saved / Offline — queued. Text, not a spinner alone |
| `DocumentView` | True-proportion render, pinch-zoom, print stylesheet shared with the PDF path |
| `ConfirmSheet` | Bottom sheet restating what is about to happen, with the number in it |
| `EmptyState` | Plain sentence plus one action. No illustration |
| `InlineWarning` | Advisory, dismissible, never blocking. Kumkum rule, not a modal |
| `DatePicker` | Native control; Indian display format (`20 Sep 2026`) matching existing quote data |

---

## 7. Loading, empty, error and success states

| Surface | Loading | Empty | Error | Success |
|---|---|---|---|---|
| Today | Three card skeletons at true height, so nothing shifts | "Nothing needs you today." + New quote | "Couldn't load. Showing your last saved copy." + Retry | Counts decrement as items clear |
| Pipeline | Skeleton rows | Unfiltered: "No enquiries yet." Filtered: "No enquiries in Sent." + Clear filter | Offline-copy pattern + Retry | — |
| Builder | Draft restores from local cache first, server reconciles | "Add a menu set to start pricing." | "Not saved. Kept on this device, will retry." Never silent | "Saved" beside the step header |
| Preview | "Building document…" with the frame already drawn | n/a | "Couldn't build the PDF." + Retry + Back to edit | Document renders; number in header |
| Send | Button reads "Sending…", disabled, still labelled | n/a | "Not sent — nothing has left. Try again." Stage unchanged | Full screen: number, follow-up date, Done |
| Menus | Category tabs render first, list fills | "No dish matches 'paneer tikka'." | Rate save failed, previous value restored, inline | "Default rate updated." |

**One rule across all four.** A failed write must never look like a successful one. When the network drops mid-save the operator sees "Kept on this device, will retry" — not a silent failure, and not a lie.

---

## 8. Responsive behaviour

Designed at 375px and enhanced upward. The desktop layout is a reward, not the source of truth.

| Breakpoint | Navigation | Builder + preview |
|---|---|---|
| 360–767 phone | Bottom tab bar, four items | Stepped single column; preview is its own screen; total pinned |
| 768–1023 tablet | Bottom bar retained; lists go two-column | Steps become one scrolling column with sticky step nav; preview still separate |
| 1024+ desktop | Tab bar moves to a left sidebar with labels | Two panes return: builder left, live preview right — the familiar studio layout, now as the enhancement |

- Tap targets ≥ 44×44 CSS px at every width.
- Bottom bars respect `env(safe-area-inset-bottom)`.
- Quote line-item tables scroll inside their own container; the page body never scrolls sideways.
- Type scales with `clamp()`; the document preview scales by zoom, not reflow, so it always matches the PDF.
- Layout driven by container width, not device sniffing, so split-screen tablet behaves correctly.

---

## 9. Accessibility requirements

WCAG 2.1 AA. The existing studio already mandates focus traps, 44px targets and labelled inputs — hold that line.

- **Contrast.** Body ≥ 4.5:1, large text ≥ 3:1. Raw `--yellow #fee405` is ~1.4:1 on cream and must never be text; the codebase already defines `--gold-text #8a6b00` for exactly this. That comment is a constraint, not a note.
- **Never colour alone.** Stage chips carry a label; overdue carries a dot *and* text; the pricing warning carries an icon and a sentence.
- **Live regions.** The running total is `aria-live="polite"`; save state announces; a total is never updated silently.
- **Focus.** Visible `:focus-visible` on every control. Sheets and dialogs trap focus, close on Escape, return focus to the trigger.
- **Labels.** Every input has a real `<label>`. Icon-only controls carry `aria-label` including counts — "Requests, 2 new", the pattern already in the studio spec.
- **Keyboard.** Full operation without a pointer at desktop width, including step navigation and the builder.
- **Motion.** `prefers-reduced-motion` removes transitions; nothing conveys state through motion alone.
- **Zoom.** Usable at 200% without horizontal scrolling of the page body.
- **Input types.** `inputmode="numeric"` for guests and rate, `type="tel"` for phone — the right keypad is an accessibility feature on a phone-first tool.

---

## 10. Interaction details

| Interaction | Behaviour |
|---|---|
| Autosave | Debounced 800ms after last keystroke, plus on step change and on backgrounding. Never a manual Save for a draft |
| Total recalculation | On input, not on blur. The operator must see the number move as they type the rate |
| Number assignment | `VAAV-YYYY-NNN` assigned server-side on first save, continuing from 016. Never client-generated — two devices would collide |
| Editing after send | Creates version 2 rather than mutating the sent document. The customer holds a copy of v1; the record must match it |
| Destructive actions | Undo toast for 6 seconds instead of a confirm dialog — except deleting a sent quote, which confirms by number |
| Offline | Reads from cache; writes queue and replay. A persistent banner names the state, matching the existing `#net-banner` |
| Follow-up snooze | One tap for +2 days, +1 week, or pick a date. Snoozing is not dismissing — it always keeps a date |
| Send channel | WhatsApp default with a pre-filled message, matching how enquiries already arrive. Copy-link and PDF as alternates |
| Currency display | Indian grouping throughout — ₹6,24,000, never ₹624,000. Tabular figures wherever amounts stack |
| Dates | Displayed `20 Sep 2026`, matching the format already in the quote records. Stored ISO |

---

## 11. UX edge cases

| Case | Handling |
|---|---|
| Unparseable enquiry | Existing behaviour holds: keep raw text whole, flag `unparsed`, still create the enquiry. Nothing is dropped for failing to parse |
| Duplicate enquiry | Form intake dedupes on phone + event date within 24h and offers to merge. Paste keeps today's permissive behaviour — a genuine repeat must not be swallowed |
| Guests or rate is zero | Allowed while drafting. Blocked at Send with a named reason: "Dinner 5 has no rate." |
| Menu set edited after quoting | Quotes store their own copy of the dish groups. Catalogue edits never rewrite history |
| Set deleted from catalogue | Old quotes render from their stored copy; the set is marked retired rather than removed |
| Very large menu | Dinner sets reach 17 dishes. Groups collapse by default; the document preview paginates |
| Two devices, one draft | Last write wins, but the losing device is told: "This quote changed on another device." Never a silent overwrite |
| Event date in the past | Inline caution on entry, not a block — quotes get raised for past events during reconciliation |
| Enquiry with no phone | Two of three live records have an empty phone. WhatsApp send is disabled with the reason shown; copy-link stays available |
| Won then cancelled | Reopen to Sent, keeping history. Stage is a state machine, not a one-way door |
| Session expiry mid-quote | Draft preserved locally; sign-in returns to the exact step. Losing a half-priced ₹6L quote to a timeout is unacceptable |
| Migration from localStorage | One-time import of `quotes`, `items`, `settings`, `requests` and the number sequence. Show what came across and what did not; keep the JSON export as the escape hatch |

---

## 12. Deliberately absent

Things a catering console usually ships with, left out because no user or business purpose justified them for a single operator at this stage.

| Not built | Why |
|---|---|
| Kanban pipeline board | A desktop metaphor that fails at 375px and gives a solo operator nothing over a stage filter |
| Analytics dashboard | Three quotes on record. Charts of three points are decoration. Revisit at fifty |
| Roles and permissions | One user. Every permission control would be dead UI |
| In-app chat / email client | Customers are on WhatsApp. Competing with the app they already use loses |
| Customer directory | No repeat-customer signal in the data yet |
| Onboarding tour | The single user built the business the tool describes |

---

## 13. Open questions

1. Does a **Won** enquiry become an event record with its own execution detail — headcount changes, staffing, purchase list — or is Won terminal for v1?
2. Should the site's menu-share keep sending to WhatsApp **as well as** the API, so nothing depends on the new intake working on day one?
3. ADR-0002 is still open: the stack is unchosen. This brief is deliberately stack-agnostic.

## 14. Not yet covered

This is a design brief, not an implementation plan. Still to be written before build: data migration steps, API surface, auth mechanism, hosting and deploy changes, and the task-level plan in the format used across `site/docs/*-plan.md`.
