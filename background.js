// Minimal service worker for Day 1
chrome.runtime.onInstalled.addListener(() => {
  console.log("FocusGuard installed — Day 1");
  // Future: migrate defaults, set initial storage keys etc.
  chrome.storage.local.get(
    ["violationCount", "currentStreak", "lastBlockedDate"],
    (res) => {
      if (typeof res.violationCount === "undefined") {
        chrome.storage.local.set({
          violationCount: 0,
          currentStreak: 0,
          lastBlockedDate: null,
        });
      }
    }
  );
});

// Placeholder: we'll add dynamic rule updates and messaging in later days.
