/**
 * Formula: estimated = plan.base + boostQuote(weeks, pct).total
 * Weekly boost rate from config (K100). Discount applies to the boost part only.
 * Floor: never below weeks × BOOST_PRICE_FLOOR_PER_WEEK (K85).
 */
const assert = require("assert");

const BOOST = { week: 100, minWeeks: 1, maxWeeks: 20, recommendedWeeks: 5 };
const FLOOR = 85;
const PLANS = [
  { id: "starter", price: 200 },
  { id: "landlord", price: 350 },
  { id: "pro", price: 1000 },
];

function boostQuote(weeks, pct = 0, week = BOOST.week, floor = FLOOR) {
  weeks = Math.max(BOOST.minWeeks, Math.min(BOOST.maxWeeks, Math.round(+weeks || 1)));
  const was = weeks * week;
  const raw = Math.round((was * (100 - pct)) / 100);
  const min = Math.round(weeks * floor);
  const total = Math.min(was, Math.max(min, raw));
  return { weeks, was, total, pct, floorApplied: raw < min, saved: was - total, weekRate: week };
}

function packageBoostQuote(planId, weeks, pct = 0) {
  const plan = PLANS.find((p) => p.id === planId) || PLANS[0];
  const b = boostQuote(weeks, pct);
  return { base: plan.price, ...b, estimated: plan.price + b.total };
}

// Starter + 5 weeks × K100 = K700
assert.strictEqual(packageBoostQuote("starter", 5).estimated, 700);
assert.strictEqual(packageBoostQuote("starter", 5).base, 200);
assert.deepStrictEqual(
  [packageBoostQuote("starter", 4).base, packageBoostQuote("starter", 4).weeks, packageBoostQuote("starter", 4).weekRate, packageBoostQuote("starter", 4).estimated],
  [200, 4, 100, 600]
);

// Other packages
assert.strictEqual(packageBoostQuote("landlord", 5).estimated, 350 + 500);
assert.strictEqual(packageBoostQuote("pro", 12).estimated, 1000 + 1200);

// 12 weeks
assert.strictEqual(packageBoostQuote("starter", 12).estimated, 200 + 1200);

// Discount 10% on boost only: was 500 → 450; estimated 650
assert.strictEqual(packageBoostQuote("starter", 5, 10).estimated, 650);
assert.strictEqual(packageBoostQuote("starter", 5, 10).total, 450);

// Floor: 50% off of 1 week would be 50, floor 85 → 85
assert.strictEqual(boostQuote(1, 50).total, 85);
assert.ok(boostQuote(1, 50).floorApplied);

// Bounds
assert.strictEqual(boostQuote(0).weeks, 1);
assert.strictEqual(boostQuote(99).weeks, 20);
assert.strictEqual(BOOST.recommendedWeeks, 5);

const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const cfg = fs.readFileSync(path.join(root, "config.js"), "utf8");
assert.match(cfg, /PAYMENTS_ENABLED:\s*false/);
assert.match(cfg, /BOOST_DISCOUNT_ENABLED:\s*false/);
const pub = ["app.js", "index.html", "templates.js", "rez-company.css"].map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
for (const bad of ["SAMPLE DATA", "PROPOSED", "NEW · PROPOSED", "+260 XXX", "260000000000", "Continue as staff", "(mock)", "Demo:"]) {
  assert.ok(!pub.includes(bad), "public file still contains " + bad);
}
assert.ok(pub.includes("#/company/"), "company route missing");
assert.ok(!pub.includes("#/about"), "about route should not be added");
const companyCss = fs.readFileSync(path.join(root, "rez-company.css"), "utf8");
assert.ok(!companyCss.includes("hero-split"), "hero-split should be gone");
assert.ok(!companyCss.includes("check-card"), "check-card should be gone");
assert.ok(!/content:\s*"✓/.test(companyCss), "registration must not use a checkmark");
assert.ok(companyCss.includes("88px"), "logo slot should be 88px");

console.log("boost-formula.test.js: all assertions passed");
console.log("Weekly rate used: K" + BOOST.week);
console.log("Formula: plan.base + weeks × K" + BOOST.week + " (= estimated); discount on boost part; floor K" + FLOOR + "/wk");
