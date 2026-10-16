# REZ Homes (static prototype)
Property listings and advertising for Zambia. No investment product.

- Plain HTML/CSS/JS, hosted on GitHub Pages. Open `index.html` to run it.
- **Data:** all data (accounts, listings, applications, saved trips) lives in the browser's localStorage via `data.js` (`DB.*`). It's per-device and demo-only. To go live, re-implement `data.js` with the Supabase client (Auth, `listings`, `applications` and Storage for photos). The UI only talks to `DB`, so it doesn't need to change.
- **Google sign-in** is a mock (demo). Real Google OAuth will come with Supabase Auth.
- Listings marked SAMPLE are not real properties. Prices marked PROPOSED are not final.
- Maps: Leaflet + OpenStreetMap (vendored in `vendor/`). Directions open Google Maps.
- Photos: Unsplash (Unsplash License), see `img/CREDITS.md`.
