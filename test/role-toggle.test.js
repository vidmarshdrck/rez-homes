/**
 * Source checks for the account role toggle.
 * The switch is a left-aligned text row, not a .seg control, and it does not
 * pull in the separate company-page files.
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert.ok(app.includes('class="role-toggle'), "role switch uses .role-toggle");
assert.ok(app.includes("List a property"), "tenant-only apply copy");
assert.ok(app.includes("Inspect for REZ"), "tenant-only inspect copy");
assert.ok(app.includes("application under review"), "pending status line");
assert.ok(app.includes("#/account?role="), "role lives on the account query");
assert.ok(app.includes("View public page"), "landlord public-page link");
assert.ok(app.includes("#/company/"), "public page href");
assert.ok(!app.includes("Open landlord portal"), "gold portal CTA removed");
assert.ok(!app.includes("Open agent tasks"), "gold portal CTA removed");
assert.ok(!app.includes("Become a landlord</h3>"), "become-a card removed");
assert.ok(!app.includes("#/account/landlord"), "no path-style landlord portal");
assert.ok(!app.includes("#/account/agent"), "no path-style agent portal");
assert.ok(!app.includes("function companyView"), "company page stays on its own PR");
assert.ok(!fs.existsSync(path.join(root, "rez-company.css")), "company stylesheet stays on its own PR");

const toggleLine = app.split("\n").find((line) => line.includes('class="role-toggle'));
assert.ok(toggleLine && !/\bseg\b/.test(toggleLine), "role switch markup is not .seg");

assert.ok(css.includes(".role-toggle{"), "toggle styles");
assert.ok(css.includes("#0B8A4A"), "active REZ green");
assert.ok(css.includes("#C5CEC8"), "middot colour");
assert.ok(css.includes("height:2px"), "underline weight");
assert.ok(!/\.role-toggle[^{]*\{[^}]*\bseg\b/.test(css), "toggle rule is not .seg");

assert.ok(html.includes("VIDM"), "footer mark");
assert.ok(html.includes("Powered by"), "footer credit");
assert.ok(!html.includes('href="#/landlord"'), "header no longer opens a landlord portal");
assert.ok(!/SAMPLE|PROPOSED|Demo badge/.test(html), "no preview labels in the shell");

console.log("role-toggle checks passed");
