# Tax Module — Build Plan (LOCKED)

Hybrid tax: **category default + product override + global off**, hierarchical inheritance, per-line snapshot. Local-first → verify → live. Commit/push only with permission.

## Locked decisions
- Default rate **18%**. Storage = **percent** (e.g. `18`), `Decimal(5,2)`, calc `/100`.
- Tax base = **subtotal only** (shipping untaxed).
- `taxEnabled` default **on**. Global off → all tax 0.
- Tax **exclusive** (added on top, shown separately).
- Rounding = **per-line round(2) → sum** (GST invoice style).
- **Per-line snapshot on OrderItem** (`taxRate` + `taxAmount`); `order.tax = Σ`. Per-rate breakup derivable from items (GST-invoice ready, no extra column).

## Rate resolution (per line)
```
1. taxEnabled = false                     → 0
2. product.taxRate set (0 honored)        → use it          (override, strongest)
3. walk product.category → parent → …     → first non-null wins (closest category)
4. none                                    → defaultTaxRate (18)
lineTax = round2(lineTotal × rate/100) ; order.tax = Σ lineTax
```
- **0 ≠ null**: `0` = explicit tax-free, `null` = inherit upward. Forms: empty = null, typed `0` = 0%.
- Closest category wins (child overrides parent); empty child inherits parent.
- `categoryId` null → default. Load all categories ONCE (parentId Map), resolve in memory (no N+1).

## Invariants (don't break)
- `order.service.computeTotals` = single source of truth (createOrder + quoteCheckout share it).
- Cart/checkout = preview only, must equal server math.
- All money = `Prisma.Decimal` (no float). Razorpay charge = server `total`.

## Per-phase workflow (every phase)
`tsc --noEmit` + `lint` → `npm test` (phase's cases) → **verify** (UI phases: run app + **screenshot** the result) → **fix** any gap → re-verify green → only then next phase. Report each phase's result before continuing.

---

## Phase 1 — Schema + data (local)
1. `schema.prisma`: `Category.taxRate Decimal? @db.Decimal(5,2)`, `Product.taxRate Decimal? @db.Decimal(5,2)`, `OrderItem.taxRate Decimal? @db.Decimal(5,2)`, `OrderItem.taxAmount Decimal @default(0) @db.Decimal(10,2)`.
2. `seed-settings.ts`: add `taxEnabled="true"`, `defaultTaxRate="18"` (group `commerce`).
3. `npx prisma generate` → `npx prisma db push` (LOCAL only).
4. Optional demo rates (Electronics 18, Books 0).
**Verify:** prisma studio shows columns + settings rows (**screenshot**).

## Phase 2 — Core calc + tests (server)
1. Helper `resolveTaxRate({ productRate, categoryId, categoryById, defaultRate, enabled })` → Decimal (off→0; override 0 honored; parent-chain walk; default).
2. `order.service`: load settings + all categories (Map) once. `computeTotals` → per-line tax (`round2`), set OrderItem `taxRate`+`taxAmount`, `order.tax = Σ`. Shipping/total unchanged.
3. `quoteCheckout` → same per-line path (Razorpay total in sync).
4. Unit tests: off→0, override (incl 0), inherit child, inherit parent (child null), child-overrides-parent, mixed cart, default fallback, null categoryId, per-line rounding.
**Verify:** `npm test` green (**screenshot** test output).

## Phase 3 — Cart/checkout preview
1. `/api/cart` GET: include each item's resolved/effective `taxRate` (server-resolved, simplest parity) or product+category chain.
2. `useCart` types: add tax fields.
3. Cart + checkout preview: per-line tax (same resolution); read `taxEnabled`/`defaultTaxRate` via small public read.
4. Tax row shows 0 / hides when disabled.
**Verify:** preview total == server order total for same cart; **screenshot** cart + checkout.

## Phase 4 — Admin UI
1. Category form: `taxRate` input (empty = inherit/none).
2. Product form: `taxRate` input (placeholder "Inherit category"); show effective rate ("Inherits Electronics → 18%").
3. Settings (commerce): **Tax enabled** toggle + **Default rate** input.
4. Validators: `taxRate` 0–100, nullable; empty→null (never coerce to 0).
**Verify:** edit each → persists; clear = inherit; **screenshot** category/product/settings forms.

## Phase 5 — Order display
1. Order detail (customer/admin/support): show `order.tax`; optional per-rate breakup from OrderItems.
**Verify:** new order tax == computed; old orders unchanged; **screenshot** order detail.

## Phase 6 — Full verify → live
1. Local: `tsc` + `npm test` + `npm run build` clean.
2. Manual orders: off / inherit-child / inherit-parent / override / mixed (**screenshots**).
3. **Then live:** `db push` Railway, set settings, commit + push (with permission) → Vercel.

---

## Build now (in-scope)
0-vs-null, settings→client, cart parity + parity test, OrderItem per-line snapshot, admin inherited-rate display, backfill-safe (auto: null→default 18, no behaviour change until rates set).

## Future (note only — don't build)
- Discount × tax base (no coupons yet).
- Shipping GST.
- Settings cache 60s lag on storefront (acceptable).
