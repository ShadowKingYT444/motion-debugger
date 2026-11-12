# PREMIUM.md: Ledgerline

## Audience and feeling
Backend and platform engineers, heads of platform and CTOs at fintech companies choosing money infrastructure · feels exact, calm and fast · unlike its category (neon dev-tool dark mode, purple fintech gradients), it feels like a bank's bound ledger come alive: permanent, ruled and accountable, but posting at network speed.

## Facts headlines come from
- One API for real-time payments and double-entry ledgers; FedNow and SEPA Instant are generally available
- p99 ledger write 38 ms · 99.999% uptime over the trailing 12 months · 41B+ entries posted · 14 rails
- Entries are append-only and hash-chained; any balance can be queried as of any moment
- Settlement: Faster Payments 3 s, FedNow 6 s, RTP 8 s, SEPA Instant 9 s, ACH same-day 4 h, ACH standard 1 d
- Writes commit on a 2-of-3 quorum across us-east, eu-west and ap-southeast; 0 acknowledged writes lost
- One payment: request → post and hold → settle → reconcile, webhook fires
- Build $0 · Scale $499/month ($399 annual), 1M entries included then $0.40 per 1,000 · Enterprise custom
- Customers moved $38B in 2025 · 11 days median to first live payment · −92% time on reconciliation

## World
- The bank cheque and its MICR line → type: every amount, ID and time in IBM Plex Mono with tabular figures (IBM machines ran bank ledgers for sixty years); display in Archivo semi-expanded, the wide engineered lettering of cheques and banknotes.
- The bound account ledger (bottle-green cloth binding, green-ruled pages, red ruling) → colour: binding green ground for dark chapters, ruled-paper green-white for light chapters, ruling red reserved for the accountant's double rule under balanced totals and the "reconciled" stamp.
- The accountant's columnar pad (Time | Particulars | Rail | Debit | Credit) → layout: the hero ledger page, the signature payment sheet, the platform spread and the pricing rate card are built on Debit/Credit column rulings; every final total ends in a red double rule.

Concept: every movement of money is posted twice and must agree. The page is a live ledger being written in front of you; motion is posting (entries ink in, totals roll, rules draw, a stamp presses).
Obvious motif we are not using as the hero: a code terminal, glowing network lines, a dashboard balance card.

## Type
Display: Archivo variable at width 110–115%, weight 650–720, tracking −0.035em: wide, engineered, cheque lettering. Text: IBM Plex Sans 17px. Figures and code: IBM Plex Mono, tabular.
Scale: hero clamp(46px, 6.4vw, 108px) at 0.94 leading; section titles clamp(36px, 4.4vw, 68px); body 17px.

## Colour and light
Ground (dark chapters) binding green #0e3027 → #0a231c; ink on dark #eef0e4. Paper (light chapters) #f0f1e6, desk tone #dfe6d2, ruling #c3d1b8; ink #0f241d, secondary ink #3d5249.
Accent strategy: ruling red #c43d2c is used for one recurring element only, the double rule under a balanced total (and the stamp that completes the signature scene). Primary actions are solid ink (paper on dark, green on paper) and wipe to red on hover: posting turns the line red.
Chapters: dark hero → paper statement and platform → dark signature (the dramatic turn) → paper developers → deep reliability → paper customers → desk-tone pricing → paper FAQ → red CTA → deepest-green footer.
Light: a desk lamp from the top left. Paper surfaces are lit top-left and shade toward the bottom right; shadows fall down-right, tinted green-black; paper carries a 4% fibre grain.

## Imagery
Hero: the live ledger page lying on the green desk in perspective, lamp-lit, entries inking in every two seconds, with a balance slip and an API receipt chip in the foreground (three planes).
Down the page: an open ledger spread holding the four capabilities (a T-account, the split flow, the settlement timetable, the reconciliation match); the signature payment sheet; the code slab with a printed receipt; the quorum map with the failure drill; six embossed compliance seals with guilloché rosettes; a 90-day availability tally.

## Motion
Personality: Kinetic, because the tension is permanent books at network speed: quick, precise, confident. quint-out cubic-bezier(.22,1,.36,1), 450–750 ms, 40–60 ms stagger. Stack: GSAP + ScrollTrigger + SplitText, no Lenis (Kinetic keeps native scroll).
Signature scene: one $4,200.00 payout to Marrow Freight is posted, settled over RTP and reconciled as you scroll; balances roll, the journal fills, the bank statement line docks against the ledger entry and the red "reconciled" stamp presses.

```
MOTION SCORE — personality: Kinetic, because exact books must feel instant
chapter      | device                                            | trigger        | timing
hero         | masked headline lines + ledger page tilts into     | load / scroll  | 750 ms, 50 ms stagger, settled ≤1.4 s
             | place, entries ink in; exit: page lies flat, copy  |                |
             | drifts up                                          |                |
statement    | words ink in as they are read                      | scrub          | --p
platform     | spread clip-reveals; T-account posts, bars grow,   | in view        | 650 ms, 50 ms stagger
             | flow lines draw, matches connect                   |                |
signature    | pinned payment sheet: request → post → settle →    | scrub 170vh    | --p
             | reconcile → stamp                                  |                |
developers   | masked heading, slab clip reveal, receipt prints   | in view / click| 650 ms
reliability  | totals roll from 60%, arcs draw, tally grows       | in view        | 650 ms, 40 ms stagger
customers    | quote crossfade, numbers roll                      | in view / timer| 650 ms
pricing      | rate card rows stagger, invoice total rolls        | in view / input| 450 ms
cta          | masked headline; slip lifts                        | in view        | 650 ms
```

## Not doing
- Geist, Inter or an italic-accent serif: the face comes from cheques and banknotes instead
- Near-black with lime: the ground is the ledger's binding green, the accent is its ruling red
- Eyebrow pills over headlines and a "New" pill: the announcement becomes a plain link in the hero foot
- Pill buttons: square-cornered (3px) controls, like a cheque's edge
- A logo marquee: the customer names become one line in the proof section
- A bento grid and identical icon cards: an open ledger spread and embossed seals
- Three pricing cards with a dark "Most popular": one ruled rate card and an invoice-style estimator
- Uniform fade-ups: reveals by content type
- Keeping a code sample, because the API is the product and the audience reads code; it is not the hero
- Keeping small monospace column heads, because they are the ledger's own column heads; nowhere else
