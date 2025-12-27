Manual and automated tests — Day 5

Quick automated checks

- Run the validation script to perform basic sanity checks:

  cd extension
  node scripts/validate.js

  This checks `manifest.json`, `rules.json` and presence of `blocked.html` and basic rule structure.

Manual test checklist

1. Load the extension locally

   - Open `chrome://extensions` (or `edge://extensions`) and enable "Developer mode".
   - Click "Load unpacked" and choose this `extension/` folder.

2. Verify Day 3 & Day 4 behavior

   - Open the extension popup: counts and streak should display correctly.
   - Add a test domain via the popup (e.g., `example.com`). It should appear in the list.
   - Visit https://example.com — you should be redirected to the extension's `blocked.html` page.
   - On the blocked page, observe the violation count increment and `lastBlockedDate` update.

3. Streak testing (simulate)

   - To simulate a day with no blocks: open the extension's service worker console (chrome://extensions → "service worker"), and in the console run:

     chrome.storage.local.set({ lastBlockedDate: '2025-01-01' })

   - Then trigger the alarm once (manual):

     chrome.alarms.clear('daily-streak');
     chrome.alarms.create('daily-streak', { when: Date.now() + 1000 });

   - After the alarm executes, inspect storage or the popup: `currentStreak` should have incremented and `streakLastUpdatedDate` set to yesterday.

Packaging for local distribution

- Create a zip of the extension folder (exclude dev files if desired) and share that zip for local load:

  cd extension
  zip -r ../focusguard.zip .

- The recipient can load the zip by extracting and using "Load unpacked" in the extensions page.

Notes

- These tests are intentionally simple and local-only (no server). For automated end-to-end tests you can use Puppeteer or Playwright to script Chrome with the extension loaded (additional setup required).
