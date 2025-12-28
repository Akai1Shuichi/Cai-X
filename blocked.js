// blocked.js — FIX reload bị tính thêm
function todayStr() {
  const d = new Date();
  return (
    String(d.getDate()).padStart(2, "0") +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    d.getFullYear()
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

function isInFocusSession(callback) {
  chrome.storage.local.get(["focusSession"], (res) => {
    const fs = res.focusSession;
    if (!fs) return callback(false);
    if (Date.now() > fs.endsAt) return callback(false);
    callback(true);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(
    ["violationCount", "currentStreak", "lastBlockedDate"],
    (res) => {
      let count = res.violationCount || 0;
      let streak = res.currentStreak || 0;
      const today = todayStr();

      // Nếu đang trong phiên tập trung → KHÔNG tăng violation
      isInFocusSession((inFocus) => {
        if (!inFocus && isRealBlockedHit()) {
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
          l.textContent = res.lastBlockedDate;
        }

        // Hiển thị domain bị chặn (nếu có) hoặc thông báo đang tập trung
        const note = document.getElementById("note");
        const focusBtn = document.getElementById("start-focus");
        if (inFocus) {
          if (note)
            note.textContent =
              "Bạn đang bật chế độ tập trung, hãy quay lại làm việc.";

          if (focusBtn) {
            focusBtn.textContent = "⏳ Đang tập trung...";
            focusBtn.disabled = true;
            focusBtn.setAttribute("aria-disabled", "true");
          }
        } else {
          const ref = document.referrer;
          if (ref) {
            try {
            } catch (_) {}
          }
          if (focusBtn) {
            focusBtn.textContent = "Quay lại và làm việc trong 25 phút";
            focusBtn.disabled = false;
            focusBtn.removeAttribute("aria-disabled");
          }
        }
      });
    }
  );

  // nút quay lại
  const backBtn = document.getElementById("back");
  if (backBtn) backBtn.addEventListener("click", () => window.close());

  // nút bật phiên tập trung — tạo focusSession và đóng tab
  const focusBtn = document.getElementById("start-focus");
  if (focusBtn) {
    focusBtn.addEventListener("click", () => {
      const now = Date.now();
      const duration = 25 * 60 * 1000; // 25 phút

      chrome.storage.local.set(
        {
          focusSession: {
            startedAt: now,
            endsAt: now + duration,
            source: "blocked_page",
          },
        },
        () => {
          focusBtn.textContent = "⏳ Đang tập trung...";
          setTimeout(() => {
            window.close(); // cắt kích thích
          }, 400);
        }
      );
    });
  }
});
