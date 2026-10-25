// REZ Homes configuration. Swap values here; nothing else needs to change.
// Internal price numbers are working drafts until Shadrick confirms them. Do not show "proposed" badges in the UI.
window.REZ_CONFIG = {
  PAYMENTS_ENABLED: false,              // payment UI records intent only; team confirms offline
  WHATSAPP_NUMBER: "260000000000",      // PLACEHOLDER until the real number is supplied
  WHATSAPP_DISPLAY: "+260 XXX XXX XXX",
  VERIFICATION_FEE: 500,                // K per property per year
  VERIFICATION_PERIOD_DAYS: 365,
  VERIFICATION_FEE_SCOPE: "property",
  LISTING_PERIOD_DAYS: 30,
  OCCUPIED_FOLLOWUP_DAYS: 90,
  PLANS: [
    { id: "starter",  name: "Starter",  price: 200,  listings: 1, photos: 10, tier: 0, tag: "Start here", perks: ["1 active listing", "10 photos", "WhatsApp enquiries", "Views & enquiry stats"] },
    { id: "landlord", name: "Landlord", price: 350,  listings: 5, photos: 15, tier: 1, perks: ["Up to 5 active listings", "15 photos each", "Views & enquiry stats", "Priority inspection booking"], popular: true },
    { id: "pro",      name: "Pro",      price: 1000, listings: 9999, photos: 30, tier: 2, perks: ["Unlimited listings", "30 photos each", "Featured on homepage", "Social media promotion", "Monthly performance report"] }
  ],
  BOOST: { week: 100, minWeeks: 1, maxWeeks: 20, recommendedWeeks: 5 },
  BOOST_DISCOUNT_ENABLED: false,         // off until Justus Q12 (random discounts) is cleared
  BOOST_DISCOUNT_MIN_PCT: 5,
  BOOST_DISCOUNT_MAX_PCT: 15,
  BOOST_PRICE_FLOOR_PER_WEEK: 85,
  BOOST_DISCOUNT_OFFER_HOURS: 24,
  DEMAND_LEVEL: "normal",
  BOOST_DEMAND_RULES: { low: { maxPct: 15 }, normal: { maxPct: 10 }, high: { off: true } },
  INSPECTOR_CERT_DAYS: 365,
  INSPECTOR_CERT_WORDING: "v1",
  AGENT_COMMISSION: 150,                // internal only — public UI must not show amounts
  AGENT_AGREEMENT_VERSION: "v1",
  DELIVERY_ENABLED: false,
  // Payment order: mobile money first, Binance (crypto), PayPal last. No account numbers or wallet addresses in the UI.
  PAY_METHODS: [
    { id: "mtn", name: "MTN Mobile Money", icon: "📱", color: "#FFCB05", group: "mobile" },
    { id: "airtel", name: "Airtel Money", icon: "📲", color: "#E40000", group: "mobile" },
    { id: "binance", name: "Binance (USDT, ETH or BTC)", icon: "₿", color: "#F0B90B", group: "crypto" },
    { id: "paypal", name: "PayPal", icon: "🅿️", color: "#003087", group: "paypal" }
  ]
};
