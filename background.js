// Background service worker (Day 3): manage dynamic declarativeNetRequest rules and respond to popup
const DEFAULT_DOMAINS = [
  "pornhub.com",
  "xvideos.com",
  "xhamster.com",
  "xnxx.com",
  "youporn.com",
  "redtube.com",
  "tube8.com",
  "beeg.com",
  "spankwire.com",
  "tnaflix.com",
  "motherless.com",
  "sextube.com",
  "porn.com",
  "4tube.com",
  "drtuber.com",
];
const DYNAMIC_RULE_ID_START = 1000;

function makeRule(id, domain) {
  return {
    id: id,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { extensionPath: "/blocked.html?hit=1" },
    },
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
        "streakLastUpdatedDate",
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
        if (typeof res.streakLastUpdatedDate === "undefined")
          toSet.streakLastUpdatedDate = null;
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
      rules.push(makeRule(Number(id), domain));
    }
    if (rules.length) {
      // Avoid attempting to add rules with IDs that are already present
      chrome.declarativeNetRequest.getDynamicRules((installed) => {
        const installedIds = new Set(
          (installed || []).map((r) => Number(r.id))
        );
        const filtered = rules.filter((r) => !installedIds.has(Number(r.id)));
        if (!filtered.length) return;
        if (filtered.length !== rules.length) {
          const skipped = rules
            .filter((r) => installedIds.has(Number(r.id)))
            .map((r) => r.id);
          console.warn(
            "Skipping restore for already-installed rule IDs:",
            skipped
          );
        }
        try {
          chrome.declarativeNetRequest.updateDynamicRules({
            addRules: filtered,
            removeRuleIds: [],
          });
        } catch (e) {
          console.warn("Failed to restore dynamic rules", e);
        }
      });
    }
  });
}

function todayStr() {
  const d = new Date();
  return (
    String(d.getDate()).padStart(2, "0") +
    "/" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "/" +
    d.getFullYear()
  );
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return (
    String(d.getDate()).padStart(2, "0") +
    "/" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "/" +
    d.getFullYear()
  );
}

function checkDailyStreak() {
  // Run once per day: if yesterday had zero blocked attempts, increment streak. If yesterday had blocks, reset.
  // Important: On first run (fresh install / missing streakLastUpdatedDate) do not increment to avoid setting streak to 1 by default.
  chrome.storage.local.get(
    ["lastBlockedDate", "currentStreak", "streakLastUpdatedDate"],
    (res) => {
      const lastBlocked = res.lastBlockedDate;
      const streakUpdated = res.streakLastUpdatedDate;
      const yesterday = yesterdayStr();

      // if we've already processed yesterday, nothing to do
      if (streakUpdated === yesterday) return;

      // If streakLastUpdatedDate is missing (first run), initialize it to yesterday without incrementing
      if (!streakUpdated) {
        chrome.storage.local.set({
          currentStreak:
            typeof res.currentStreak === "number" ? res.currentStreak : 0,
          streakLastUpdatedDate: yesterday,
        });
        return;
      }

      if (lastBlocked === yesterday) {
        // there was a block yesterday -> reset streak
        chrome.storage.local.set({
          currentStreak: 0,
          streakLastUpdatedDate: yesterday,
        });
      } else {
        // no block yesterday -> increment streak
        const newStreak = (res.currentStreak || 0) + 1;
        chrome.storage.local.set({
          currentStreak: newStreak,
          streakLastUpdatedDate: yesterday,
        });
      }
    }
  );
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm && alarm.name === "daily-streak") {
    checkDailyStreak();
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  await ensureStorage();
  restoreDynamicRules();

  try {
    chrome.alarms.create("daily-streak", { periodInMinutes: 24 * 60 });
  } catch (e) {
    console.warn("Failed to create daily alarm", e);
  }

  // run once now to ensure state is up-to-date
  checkDailyStreak();
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

      // Determine a safe unique id by looking at both stored mapping and currently installed dynamic rules
      chrome.declarativeNetRequest.getDynamicRules((installed) => {
        const installedIds = (installed || [])
          .map((r) => Number(r.id))
          .filter((n) => !isNaN(n));
        const storedIds = Object.values(mapping)
          .map(Number)
          .filter((n) => !isNaN(n));
        const allIds = installedIds.concat(storedIds);
        const max = allIds.length
          ? Math.max(...allIds)
          : DYNAMIC_RULE_ID_START - 1;
        const id = max + 1;
        const rule = makeRule(id, domain);

        try {
          chrome.declarativeNetRequest.updateDynamicRules(
            { addRules: [rule], removeRuleIds: [] },
            () => {
              if (chrome.runtime.lastError) {
                console.error(
                  "[addDomain] Failed to add rule:",
                  chrome.runtime.lastError
                );
                return reject(
                  "Failed to add rule: " + chrome.runtime.lastError.message
                );
              }

              // update storage mapping
              mapping[domain] = id;
              user.push(domain);

              chrome.storage.local.set(
                { userBlockedDomains: user, dynamicRules: mapping },
                () => {
                  if (chrome.runtime.lastError) {
                    console.error(
                      "[addDomain] Failed to save storage:",
                      chrome.runtime.lastError
                    );
                    return reject(
                      "Failed to save storage: " +
                      chrome.runtime.lastError.message
                    );
                  }
                  resolve({ domain, id });
                }
              );
            }
          );
        } catch (e) {
          console.error("[addDomain] Exception:", e);
          reject("Failed to add rule: " + e.message);
        }
      });
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
      if (!id) {
        return reject("Domain not found");
      }

      const numId = Number(id);

      // Get ALL rules (both dynamic and static) to see the full picture
      chrome.declarativeNetRequest.getDynamicRules((dynamicRules) => {
        chrome.declarativeNetRequest.getSessionRules((sessionRules) => {
          const allRuleIds = [...dynamicRules, ...sessionRules].map(
            (r) => r.id
          );

          // Try to remove from BOTH dynamic and session rules
          Promise.all([
            new Promise((res) => {
              chrome.declarativeNetRequest.updateDynamicRules(
                { addRules: [], removeRuleIds: [numId] },
                () => {
                  res();
                }
              );
            }),
            new Promise((res) => {
              chrome.declarativeNetRequest.updateSessionRules(
                { addRules: [], removeRuleIds: [numId] },
                () => {
                  res();
                }
              );
            }),
          ]).then(() => {
            // Wait a bit for the removal to take effect
            setTimeout(() => {
              // Verify removal
              chrome.declarativeNetRequest.getDynamicRules((afterDynamic) => {
                chrome.declarativeNetRequest.getSessionRules((afterSession) => {
                  const afterIds = [...afterDynamic, ...afterSession].map(
                    (r) => r.id
                  );

                  if (afterIds.includes(numId)) {
                    console.error(
                      `[removeDomain] Rule ${numId} STILL EXISTS after removal!`
                    );
                    // Continue anyway and clean up storage
                  }

                  // Update storage
                  delete mapping[domain];
                  const idx = user.indexOf(domain);
                  if (idx !== -1) user.splice(idx, 1);

                  chrome.storage.local.set(
                    { userBlockedDomains: user, dynamicRules: mapping },
                    () => {
                      resolve({ domain, id: numId });
                    }
                  );
                });
              });
            }, 100); // Small delay to ensure removal propagates
          });
        });
      });
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
