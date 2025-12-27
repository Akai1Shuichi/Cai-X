// Minimal popup to show count and allow adding sites (UI only, add site not yet hooked up to dynamic rules)
document.addEventListener("DOMContentLoaded", function () {
  chrome.storage.local.get(["violationCount", "currentStreak"], function (res) {
    document.getElementById("count").textContent = res.violationCount || 0;
    document.getElementById("streak").textContent =
      "🔥 Streak: " + (res.currentStreak || 0);
  });

  document.getElementById("add").addEventListener("click", function () {
    var site = document.getElementById("site").value.trim();
    if (!site) return alert("Nhập domain (ví dụ: example.com)");
    // Day 3: we'll call background to add dynamic rule. For now, just alert.
    alert("Ngày 3: sẽ thêm rule cho: " + site);
  });
});
