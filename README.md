# REZ Homes (static prototype)
Property listings and advertising for Zambia. No investment product.

- Plain HTML/CSS/JS, hosted on GitHub Pages. Open `index.html` to run it.
- **Data:** all data (accounts, listings, applications, saved trips) lives in the browser's localStorage via `data.js` (`DB.*`). It's per-device and demo-only. To go live, re-implement `data.js` with the Supabase client (Auth, `listings`, `applications` and Storage for photos). The UI only talks to `DB`, so it doesn't need to change.
- **Google sign-in** is a mock (demo). Real Google OAuth will come with Supabase Auth.
- Listings marked SAMPLE are not real properties. Prices marked PROPOSED are not final.
- Maps: Leaflet + OpenStreetMap (vendored in `vendor/`). Directions open Google Maps.
- Photos: Unsplash (Unsplash License), see `img/CREDITS.md`.

## v3 (October 2026)
- `config.js`: `PAYMENTS_ENABLED=false`, `WHATSAPP_NUMBER` (placeholder), verification fee (K250, PROPOSED), plans (Starter K200 / Landlord K350 / Pro K1,000), boost (K100/week, K300/month). All prices are PROPOSED.
- Verification: Draft → Awaiting verification payment → Inspection scheduled → Verified / Rejected. Only Verified listings show the badge.
- Lifecycle: active, occupied (hidden, stays verified), expired (plan unpaid), reactivate (no re-inspection unless staff flagged it), tenant leaving soon (relist early).
- Landlord portal: plan, views/enquiries/applications, days listed, fee due, upgrade path, property care tips.
- Staff portal (`#/admin`, demo staff mode only): verification queue, all listings, payments, overdue, occupied follow-up.
- Payment buttons (MTN, Airtel, Card, Binance Pay) only show a "launching soon, contact REZ on WhatsApp" sheet with a reference. Nothing is charged.
- Types include Flat and Shop / Store; 3D / Street View + satellite links; "Recommended for you" and "Similar homes".
- Backend plan: `../supabase/` (additions to Solomon's group schema). Launch: `../launch_checklist.md`. Tests: `../test/v3.js`.
