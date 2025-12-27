const fs = require("fs");
const path = require("path");

function fail(msg) {
  console.error("✖", msg);
  process.exitCode = 2;
}

function ok(msg) {
  console.log("✔", msg);
}

function loadJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    fail(`Cannot read/parse ${p}: ${e.message}`);
    return null;
  }
}

function run() {
  const root = path.resolve(__dirname, "..");
  const manifestPath = path.join(root, "manifest.json");
  const rulesPath = path.join(root, "rules.json");

  if (!fs.existsSync(manifestPath)) return fail("manifest.json not found");
  if (!fs.existsSync(rulesPath)) return fail("rules.json not found");

  const manifest = loadJSON(manifestPath);
  const rules = loadJSON(rulesPath);

  // Basic manifest checks
  if (manifest.manifest_version !== 3) fail("manifest_version should be 3");
  else ok("manifest_version == 3");
  if (!manifest.background || !manifest.background.service_worker)
    fail("background.service_worker missing");
  else ok("background.service_worker exists");
  if (!manifest.declarativeNetRequest)
    fail("declarativeNetRequest config missing");
  else ok("declarativeNetRequest configured");
  if (!manifest.web_accessible_resources)
    fail("web_accessible_resources missing. blocked page must be accessible");
  else ok("web_accessible_resources present");

  // Rules checks
  if (!Array.isArray(rules)) return fail("rules.json must be an array");
  ok(`rules.json contains ${rules.length} entries`);

  const ids = new Set();
  rules.forEach((r, idx) => {
    if (typeof r.id !== "number") fail(`rule[${idx}].id must be a number`);
    if (ids.has(r.id)) fail(`Duplicate rule id ${r.id}`);
    ids.add(r.id);
    if (!r.action || r.action.type !== "redirect")
      fail(`rule[${idx}] must be a redirect`);
    if (
      !r.action.redirect ||
      typeof r.action.redirect.extensionPath !== "string"
    )
      fail(`rule[${idx}] redirect must point to extensionPath`);
    if (!r.condition || !r.condition.urlFilter)
      fail(`rule[${idx}] missing condition.urlFilter`);
  });

  ok("rules.json format looks good");

  // Check blocked page exists
  const blockedHtml = path.join(root, "blocked.html");
  if (!fs.existsSync(blockedHtml)) fail("blocked.html not found");
  else ok("blocked.html exists");

  console.log(
    "\nValidation finished. If no errors were printed, basic checks passed."
  );
}

run();
