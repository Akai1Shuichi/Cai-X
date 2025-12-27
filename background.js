// Background service worker (Day 3): manage dynamic declarativeNetRequest rules and respond to popup
const DEFAULT_DOMAINS = ["pornhub.com", "xvideos.com", "xhamster.com"];
const DYNAMIC_RULE_ID_START = 1000;

function makeRule(id, domain) {
  return {
    id: id,
    priority: 1,
    action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
    condition: {
      urlFilter: "||" + domain + "^",
      resourceTypes: ["main_frame"],
    },
  };
}

function normalizeDomain(s) {
  return s
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .trim();
}

async function ensureStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      [
        "violationCount",
        "currentStreak",
        "lastBlockedDate",
        "userBlockedDomains",
        "dynamicRules",
      ],
      (res) => {
        const toSet = {};
        if (typeof res.violationCount === "undefined") toSet.violationCount = 0;
        if (typeof res.currentStreak === "undefined") toSet.currentStreak = 0;
        if (typeof res.lastBlockedDate === "undefined")
          toSet.lastBlockedDate = null;
        if (!Array.isArray(res.userBlockedDomains))
          toSet.userBlockedDomains = [];
        if (typeof res.dynamicRules !== "object" || res.dynamicRules === null)
          toSet.dynamicRules = {};
        if (Object.keys(toSet).length)
          chrome.storage.local.set(toSet, () => resolve());
        else resolve();
      }
    );
  });
}

// Restore any stored dynamic rules (id/domain mapping) on install/start
async function restoreDynamicRules() {
  chrome.storage.local.get(["dynamicRules"], (res) => {
    const mapping = res.dynamicRules || {};
    const rules = [];
    for (const [domain, id] of Object.entries(mapping)) {
      rules.push(makeRule(id, domain));
    }
    if (rules.length) {
      try {
        chrome.declarativeNetRequest.updateDynamicRules({
          addRules: rules,
          removeRuleIds: [],
        });
      } catch (e) {
        console.warn("Failed to restore dynamic rules", e);
      }
    }
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  console.log("FocusGuard installed — Day 3");
  await ensureStorage();
  restoreDynamicRules();
});

// Utility: get next available dynamic id
function nextDynamicId(existingMapping) {
  const ids = Object.values(existingMapping || {})
    .map(Number)
    .filter((n) => !isNaN(n));
  const max = ids.length ? Math.max(...ids) : DYNAMIC_RULE_ID_START - 1;
  return max + 1;
}

function addDomain(domain) {
  return new Promise((resolve, reject) => {
    domain = normalizeDomain(domain);
    if (!domain || domain.length < 3) return reject("Invalid domain");
    if (DEFAULT_DOMAINS.includes(domain))
      return reject("Domain is already in defaults");

    chrome.storage.local.get(["userBlockedDomains", "dynamicRules"], (res) => {
      const user = res.userBlockedDomains || [];
      const mapping = res.dynamicRules || {};
      if (user.includes(domain) || mapping[domain])
        return reject("Domain already added");

      const id = nextDynamicId(mapping);
      const rule = makeRule(id, domain);

      try {
        chrome.declarativeNetRequest.updateDynamicRules(
          { addRules: [rule], removeRuleIds: [] },
          () => {
            // update storage mapping
            mapping[domain] = id;
            user.push(domain);
            chrome.storage.local.set(
              { userBlockedDomains: user, dynamicRules: mapping },
              () => {
                resolve({ domain, id });
              }
            );
          }
        );
      } catch (e) {
        reject("Failed to add rule: " + e.message);
      }
    });
  });
}

function removeDomain(domain) {
  return new Promise((resolve, reject) => {
    domain = normalizeDomain(domain);
    chrome.storage.local.get(["userBlockedDomains", "dynamicRules"], (res) => {
      const user = res.userBlockedDomains || [];
      const mapping = res.dynamicRules || {};
      const id = mapping[domain];
      if (!id) return reject("Domain not found");

      try {
        chrome.declarativeNetRequest.updateDynamicRules(
          { addRules: [], removeRuleIds: [Number(id)] },
          () => {
            // update storage mapping
            delete mapping[domain];
            const idx = user.indexOf(domain);
            if (idx !== -1) user.splice(idx, 1);
            chrome.storage.local.set(
              { userBlockedDomains: user, dynamicRules: mapping },
              () => {
                resolve({ domain, id });
              }
            );
          }
        );
      } catch (e) {
        reject("Failed to remove rule: " + e.message);
      }
    });
  });
}

// Respond to popup messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) return;
  if (msg.action === "getBlockedList") {
    chrome.storage.local.get(["userBlockedDomains", "dynamicRules"], (res) => {
      sendResponse({
        defaults: DEFAULT_DOMAINS,
        userBlocked: res.userBlockedDomains || [],
        mapping: res.dynamicRules || {},
      });
    });
    return true; // will respond asynchronously
  }

  if (msg.action === "addDomain") {
    addDomain(msg.domain)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (msg.action === "removeDomain") {
    removeDomain(msg.domain)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
});
