# TODO / Backlog PRD

Parked ideas and feasibility notes, to schedule later. The first detailed entry
is **Delivery & Fulfilment**; smaller parked items are in the **Backlog** at the
end. Read `general-prd.md`, `backend-prd.md`, `frontend-prd.md` first.

---

# Delivery & Fulfilment

Status: **Parked (design/feasibility)** — a multi-method delivery system so a
buyer/receiver can get an item without necessarily meeting the seller.

---

## 1. Problem & goal

Today the only fulfilment path is **meet in person** (safe meet points +
safe-transit). That caps LetsCycle at "things close enough to collect." We want
fulfilment to scale with **package size** and **distance to the receiver**, and
to let the **seller not have to meet the buyer** when they'd rather ship.

**Goal:** when listing (seller) or at checkout (buyer/receiver), choose a
delivery method appropriate to the item's size and the distance; on purchase,
arrange fulfilment (in-person, courier, post, or van) and release escrow on
delivery.

---

## 2. Key reframing (before we build anything)

Don't model this as named brands — model it as **fulfilment categories**, each
backed by a **pluggable provider** (with a dummy first, like our other seams).
Brand names map onto categories, not the other way round:

| Method (user-facing) | Category | Realistic provider(s) | API reality |
| --- | --- | --- | --- |
| **Meet in person** | Local hand-off | (none — us) | ✅ already built (meet points + safe-transit) |
| **Local courier** ("e-bike / Uber") | On-demand last-mile | **Uber Direct**, **Stuart** (DoorDash, Liverpool) | ✅ real APIs; need business account + coverage |
| **Post / parcel** | Carrier shipping | **Shippo / EasyPost / Sendcloud**, Royal Mail Click&Drop | ✅ most mature; label + tracking in one API |
| **Large item / van** ("U-Haul") | Man-and-van | **AnyVan / Shift** | ⚠️ usually **quote-based**; likely referral first, not 1-tap |

Notes that change the plan:

- **"Deliveroo" has no P2P parcel API.** The category is on-demand courier →
  Uber Direct / Stuart. **e-bike + Uber collapse into one method.**
- **"U-Haul" is van rental, not a delivery API.** Large-item is man-and-van,
  and those are quote-driven — so v1 is a **quote/referral**, not instant booking.
- **Post is the easiest real integration** — start there for "not local."

---

## 3. Eligibility: method = f(size, distance, item)

Every listing gets a **size class**; every checkout knows the **distance** from
seller to receiver. Eligible methods are the intersection.

| Size class | Example | Meet | Courier (≤~10–15km) | Post | Van |
| --- | --- | --- | --- | --- | --- |
| **Small** | books, clothes, phone | ✅ | ✅ | ✅ | — |
| **Medium** | microwave, small chair | ✅ | ✅ (bike/car) | ✅ (heavier tariff) | — |
| **Large** | armchair, TV | ✅ | ⚠️ car-only, short range | ⚠️ pallet/limited | ✅ |
| **Bulky** | sofa, wardrobe, fridge | ✅ (if collectable) | — | — | ✅ |

- **Distance** gates couriers (out of range → post or van) and drives price.
- **Item type** gates carriers (prohibited/hazardous lists differ per provider).
- Free/giveaway items: same methods; who pays delivery is a policy choice (§6).

---

## 4. User flows

**Seller, when listing:**
- Enters **dimensions/weight** (or picks a size class) — needed for quotes.
- Chooses **allowed methods** (e.g. "meet up + post", or "any"). Defaults from
  size class. Can set a **collection address** (kept private) for courier/van.

**Buyer/receiver, at checkout:**
- Sees eligible methods with **live quotes** (courier/post) or "request a quote"
  (van), picks one, enters a **delivery address** if not meeting.
- Pays **item + delivery**; sees the combined total.

**On purchase (the important correction):**
- For **meet-up**: unchanged — arrange time/meet point, both confirm pickup.
- For **courier/post/van**: **book the provider at/after checkout** (delivery
  *is* the fulfilment). Flow becomes **booked → collected → in-transit →
  delivered**. **Escrow releases on `delivered`** (tracking/webhook), not a
  mutual tap. Notify both parties at each state change (ties into Notifications).

---

## 5. Architecture (fits our existing seam pattern)

Mirror the dummy-seam approach used for Cognito/S3/Stripe/SES.

```
DeliveryProvider (interface)
  quote(input: { fromAddr, toAddr, sizeClass, dims?, weight? }) -> Quote[]
  book(input: { quoteId, order, pickup, dropoff }) -> Shipment
  cancel(shipmentId) -> void
  track(shipmentId) -> ShipmentStatus        // or webhook ingestion
```

- **`createDummyDelivery()`** first: deterministic quotes by size/distance,
  synthetic tracking that advances on a timer — the whole flow runs end-to-end
  with no external account (exactly how the dummy Stripe/S3 let us build).
- Real adapters later, ideally via **aggregators** to cut N integrations:
  - Post → one shipping aggregator (Shippo/EasyPost/Sendcloud).
  - Courier → Uber Direct **or** Stuart behind the same interface.
  - Van → quote request (email/manual) until an API is worth it.
- Provider credentials live in **Secrets Manager** (never in code/env/DB).
- A `delivery` module owns this; transactions emit events it reacts to
  (extractable-module discipline, like matching/notifications).

---

## 6. Data model additions (sketch)

- **Listing**: `sizeClass` (enum) + optional `lengthCm/widthCm/heightCm/weightG`;
  `allowedDeliveryMethods[]`; optional private `collectionArea` (coarse until paid).
- **Order/Transaction**: `deliveryMethod`, `deliveryQuotePence`, `deliveryStatus`,
  `providerRef`/`trackingUrl`, buyer `deliveryAddressId`, seller `collectionAddressId`.
- **New `Delivery`/`Shipment`**: `transactionId`, `provider`, `status`,
  `quotePence`, `trackingRef`, `events[]`, timestamps.
- **New `Address`** (PII): line1/2, city, postcode, contact — **GDPR-sensitive**,
  encrypted-at-rest, included in erasure/export, revealed only when a deal is on.

---

## 7. Payments impact

- Buyer pays **item price + delivery fee** (+ existing commission).
- **Delivery fee routing**: platform pays the provider and recoups from the
  buyer's charge (simplest), or a separate line item. Needs a clear ledger.
- **Failure/refunds**: undelivered/cancelled shipment → refund path distinct
  from item disputes. Escrow must not release if delivery fails.
- Revisit the escrow trigger: **`delivered` event** for shipped methods,
  **mutual pickup** for meet-up.

---

## 8. Risks / open questions

- **Provider coverage at launch** (Liverpool): does Uber Direct / Stuart cover
  our radius? Van providers' quote latency (not instant).
- **Large-item is the weak link** — likely manual/quote v1; set expectations.
- **PII & liability**: addresses, prohibited/hazardous items per carrier,
  insurance/claims when items are damaged in transit, who's liable.
- **Pricing accuracy**: quotes vary with dims/weight the seller self-declares →
  under-declaration disputes.
- **VAT** on delivery; **giveaway** delivery — does the receiver pay? (likely yes.)
- **Not-there / failed handoff** for couriers; redelivery cost owner.

---

## 9. Phased rollout (proposed)

- **P0 — Method as metadata (no integration).** Size class on listings; seller's
  allowed methods; buyer picks at checkout; meet-up works as today; everything
  else says "arrange in chat." Ships value, zero provider risk. *(Small.)*
- **P1 — Dummy DeliveryProvider + delivery-aware order flow.** Quotes, booking,
  tracking states, escrow-on-delivered — all against the dummy. Full UX, no
  external accounts. *(Medium.)*
- **P2 — Post via a shipping aggregator.** First real integration (label +
  tracking). *(Medium.)*
- **P3 — Local courier (Uber Direct / Stuart).** *(Medium/large — accounts, coverage.)*
- **P4 — Large-item quote/referral (AnyVan/Shift).** *(Quote-based; maybe never full API.)*

---

## 10. What we already have to build on

- **Transactions**: escrow state machine; `meetPointId` + `agreedPickupAt`
  already on the order — the model anticipated fulfilment metadata.
- **Safety**: verified **meet points** (PostGIS) + **safe-transit** = the
  "meet in person" method, essentially done.
- **Seam/dummy pattern**: proven for Cognito/S3/Stripe/SES — drop `DeliveryProvider`
  in the same shape.
- **Notifications module** (backend built): the natural channel for
  "collected / out for delivery / delivered" updates.
- **Money as integer pence**, Secrets Manager discipline, module boundaries —
  all already enforced.

---

## 11. Recommendation

Feasible, and a strong differentiator — **but sequence it.** Don't build four
brand integrations at once. Ship **P0 (method metadata + meet-up)** to capture
the UX and data, then **P1 (dummy provider + delivery-aware escrow)** to prove
the flow, then integrate **post → courier → van** in that order of API maturity.
Treat "U-Haul/large-item" as quote/referral until an API earns its keep.

---

# Backlog — other parked items

## Sign in with Apple (iOS OAuth)

A social-login alternative alongside Google. Apple's "Sign in with Apple" is
OIDC, so it drops into the **same seam as Google**: an `AppleVerifier` that
checks the Apple ID token against Apple's JWKS (RS256), audience = our Services
ID; the frontend renders Apple's JS button; on success we POST the token to a
`/auth/apple` route that find-or-creates the user (identical to `loginWithGoogle`).

- **Setup cost**: an Apple Developer account ($99/yr), a **Services ID**, a
  private key, and configured return URLs/domains — heavier than Google.
- **Privacy quirk**: Apple can hand back a **private-relay email** (and only the
  name on first consent), so store name defensively and treat the relay email as
  the identity.
- **Why it matters**: if a **native iOS app** ships and offers other social
  logins, the App Store **requires** Sign in with Apple.
- **Feasibility**: straightforward (mirrors Google); mostly setup + config.

## Admin moderation & listing-delete review

Requested: when a user deletes a listing, **notify an admin** and keep it
**hidden/disabled until an admin verifies**, rather than hard-deleting.

- **Needs a moderation subsystem we don't have yet:**
  1. An **admin role** — tokens carry roles, but there are no admin users or UI.
  2. A new listing status (e.g. `pendingReview` / `disabled`) — enum + migration.
  3. **Admin notifications** + an **admin console** to approve/reject.
- **Interim (buildable now):** user delete → existing soft-remove (`removed`
  status) + an **audit-log event** for later review. Full hold-until-verified
  waits for the admin system.
- **Open question:** why gate a user's delete of *their own* listing on admin
  review? Deleting your own listing is normally allowed outright; admin review
  usually applies to *reports/abuse* or to stop a seller **deleting to dodge an
  active purchase/dispute**. If the goal is the latter, the rule is simpler:
  *block edit/delete once interest or a transaction exists* (see below) — no
  admin needed. Clarify intent before building.

## User address / home location

Profile "update address": the `User` model has a **`homeLocation` (PostGIS
point)** + accuracy, not a street address.

- Options: (a) a **home-location map picker** (fits distance/matching, no new PII
  text); (b) a proper **postal `Address` entity** — needed anyway for Delivery
  (see §6 above), GDPR-sensitive; (c) a simple text field (migration).
- **Recommendation:** do the **home-location picker** with the maps step, and a
  **postal address** as part of the Delivery work (P0). Phone update already
  works today.
