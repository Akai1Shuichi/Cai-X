# FocusGuard — MVP (Day 1)

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
- Load the extension (see above), visit a blocked site, observe `blocked.html` shows updated counts and the popup reflects the new last blocked date. Next: Day 3 — allow adding sites from popup and persist dynamic rules.
