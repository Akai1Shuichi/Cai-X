# Cai X — MVP (Day 1)

What's included (Day 1):

- `manifest.json` (MV3) with a default `rules.json` ruleset to redirect blocked sites to `blocked.html`.
- `background.js` — minimal service worker that initializes storage.
- `blocked.html` + `blocked.js` — shows a simple blocked page and increments `violationCount` in `chrome.storage.local` on load.
- `popup.html` + `popup.js` — minimal UI showing counts (add-site is a Day 3 placeholder).

How to test locally:

1. Open Chrome/Edge and go to `chrome://extensions` (or `edge://extensions`).
2. Enable "Developer mode".
3. Click "Load unpacked" and select this `extension/` folder.
4. Visit one of the domains in `rules.json` (e.g., `https://pornhub.com`) — you should be redirected to `blocked.html` and the counter will increment.

Notes / limitations (Day 1):

- Redirection uses declarativeNetRequest rule resources and redirects to internal `blocked.html`.
- For Day 1 we increment the counter when `blocked.html` loads; later we'll ensure reliably we carry the original URL and add better UX + streak logic.

Day 2: Blocked page UI and counter/streak updates implemented. The blocked page now shows a stronger message, attempted host (when available), total violation count, and last blocked date; on load it increments `violationCount`, resets `currentStreak` to 0, and sets `lastBlockedDate` to today.

How to test Day 2:

- Load the extension (see above), visit a blocked site, observe `blocked.html` shows updated counts and the popup reflects the new last blocked date. Day 3: Popup add/remove implemented. You can now add custom domains from the popup; the background service worker creates dynamic declarativeNetRequest rules for each added domain and persists them in `chrome.storage.local`. To test Day 3: add a domain (e.g., `example.com`) via the popup, verify it appears in the list, then visit `https://example.com` and confirm you are redirected to `blocked.html`. Removing a domain from the popup will remove the dynamic rule immediately.

Day 4: Streak logic & polish UI implemented. Behavior:

- A daily alarm checks whether _yesterday_ had zero blocked attempts. If so, `currentStreak` is incremented by 1; if not, `currentStreak` is reset to 0.
- `streakLastUpdatedDate` stores which day the streak was last processed to prevent double counting.
- When a blocked attempt happens, streak is reset to 0 and `streakLastUpdatedDate` is set to today.

How to test Day 4:

- Reload the extension.

Day 5: Test & local packaging

- Run quick validation: `node scripts/validate.js` (no deps). This checks basic manifest/rules/blocked page structure.
- Manual test checklist and packaging instructions are in `TESTING.md`.

Packaging locally:

- Create a zip of the `extension/` folder for sharing or local load: `cd extension && zip -r ../cai-x.zip .`
- To simulate a block: visit a blocked domain; `currentStreak` should be reset to 0 and `lastBlockedDate` set to today.
- To simulate a day with no blocks: manually set `lastBlockedDate` in `chrome.storage.local` to a date earlier than yesterday, then run `chrome.alarms.clear('daily-streak')` and `chrome.alarms.create('daily-streak', {when: Date.now() + 1000})` in the background console (or wait a day). After the alarm runs, `currentStreak` should increment and `streakLastUpdatedDate` should be set to yesterday.
