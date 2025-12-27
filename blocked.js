// blocked.js — FIX reload bị tính thêm
function todayStr() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

// chỉ count nếu có hit=1 từ redirect và có referrer hợp lệ (tránh reload trực tiếp)
function isRealBlockedHit() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("hit") !== "1") return false;
  const ref = document.referrer || "";
  if (!ref) return false; // direct open or reload without referrer
  // ignore extension/internal referrers
  if (
    ref.startsWith("chrome-extension://") ||
    ref.startsWith("chrome://") ||
    ref.startsWith("about:")
  )
    return false;
  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(
    ["violationCount", "currentStreak", "lastBlockedDate"],
    (res) => {
      let count = res.violationCount || 0;
      let streak = res.currentStreak || 0;
      const today = todayStr();

      // ✅ CHỈ TĂNG KHI TRUY CẬP TRANG CẤM
      if (isRealBlockedHit()) {
        count += 1;
        streak = 0;

        chrome.storage.local.set({
          violationCount: count,
          currentStreak: streak,
          lastBlockedDate: today,
        });
      }

      // Render UI
      const c = document.getElementById("count");
      if (c) c.textContent = count;

      const s = document.getElementById("streak");
      if (s) s.textContent = streak;

      const l = document.getElementById("last");
      if (l && res.lastBlockedDate) {
        l.textContent = "📅 Lần gần nhất: " + res.lastBlockedDate;
      }

      // Hiển thị domain bị chặn (nếu có)
      const ref = document.referrer;
      if (ref) {
        try {
          const host = new URL(ref).hostname.replace("www.", "");
          const note = document.getElementById("note");
          if (note) note.textContent = "Bạn vừa cố truy cập: " + host;
        } catch (_) {}
      }
    }
  );

  // nút quay lại
  const backBtn = document.getElementById("back");
  if (backBtn) backBtn.addEventListener("click", () => window.close());
});
