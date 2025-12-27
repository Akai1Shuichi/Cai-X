// Minimal counter increment on blocked page load (Day 1)
document.addEventListener("DOMContentLoaded", function () {
  // Increment violationCount
  chrome.storage.local.get(
    ["violationCount", "currentStreak", "lastBlockedDate"],
    function (res) {
      var count = (res.violationCount || 0) + 1;
      chrome.storage.local.set({ violationCount: count }, function () {
        var el = document.getElementById("count");
        if (el) el.textContent = count;
      });

      // Show streak if available (Day 1: simple placeholder)
      var s = res.currentStreak != null ? res.currentStreak : 0;
      var stEl = document.getElementById("streak");
      if (stEl) stEl.textContent = "🔥 Streak hiện tại: " + s;
    }
  );

  // Back button closes the tab (user can navigate away)
  var btn = document.getElementById("back");
  if (btn)
    btn.addEventListener("click", function () {
      window.close();
    });
});
