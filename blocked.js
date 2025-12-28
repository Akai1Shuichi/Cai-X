// blocked.js — CHỈ count khi redirect từ background, KHÔNG count khi truy cập trực tiếp

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

function formatLastTime(dateStr) {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const date = new Date(year, month - 1, day);
      const now = new Date();
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Hôm nay";
      if (diffDays === 1) return "Hôm qua";
      if (diffDays < 7) return `${diffDays} ngày trước`;
      return dateStr;
    }
  } catch (_) {}
  return dateStr;
}

// Kiểm tra có phải là lần truy cập THỰC SỰ từ redirect không
function isRealBlockedHit() {
  const params = new URLSearchParams(window.location.search);

  // QUAN TRỌNG: Phải có ?hit=1 trong URL
  if (params.get("hit") !== "1") {
    console.log("[FocusGuard] No hit=1 parameter, skipping count");
    return false;
  }

  // Kiểm tra xem có phải là reload hay không
  try {
    const entries = performance.getEntriesByType("navigation");
    if (entries && entries.length) {
      const nav = entries[0];
      if (nav.type === "reload") {
        console.log("[FocusGuard] Page reload detected, skipping count");
        return false;
      }
    } else if (performance.navigation && performance.navigation.type === 1) {
      console.log(
        "[FocusGuard] Page reload detected (fallback), skipping count"
      );
      return false;
    }
  } catch (_) {}

  // Kiểm tra referrer - nếu là extension page thì skip
  const ref = document.referrer || "";
  if (ref.includes("chrome-extension://") && ref.includes("blocked.html")) {
    console.log("[FocusGuard] Self-referrer detected, skipping count");
    return false;
  }

  console.log("[FocusGuard] Real blocked hit detected ✓");
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

// Xóa ?hit=1 khỏi URL sau khi đã xử lý (tránh refresh lại bị tính)
function clearHitParameter() {
  const url = new URL(window.location.href);
  if (url.searchParams.has("hit")) {
    url.searchParams.delete("hit");
    window.history.replaceState({}, "", url.toString());
    console.log("[FocusGuard] Cleared hit parameter from URL");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(
    ["violationCount", "currentStreak", "lastBlockedDate"],
    (res) => {
      let count = res.violationCount || 0;
      let streak = res.currentStreak || 0;
      const today = todayStr();

      // Kiểm tra xem có phải lần truy cập thực sự không
      const shouldCount = isRealBlockedHit();

      // Nếu đang trong phiên tập trung → KHÔNG tăng violation
      isInFocusSession((inFocus) => {
        if (!inFocus && shouldCount) {
          count += 1;
          streak = 0;

          chrome.storage.local.set({
            violationCount: count,
            currentStreak: streak,
            lastBlockedDate: today,
          });

          console.log("[FocusGuard] Violation counted:", count);
        }

        // Xóa ?hit=1 sau khi đã xử lý
        if (shouldCount) {
          clearHitParameter();
        }

        // Render UI
        const countEl = document.getElementById("count");
        if (countEl) countEl.textContent = count;

        const streakEl = document.getElementById("streak");
        if (streakEl) streakEl.textContent = streak;

        const lastDayEl = document.getElementById("last-day");
        if (lastDayEl) {
          if (res.lastBlockedDate) {
            const parts = res.lastBlockedDate.split("/");
            if (parts.length === 3) {
              lastDayEl.textContent = parts[0] + "/" + parts[1];
            } else {
              lastDayEl.textContent = "—";
            }
          } else {
            lastDayEl.textContent = "—";
          }
        }

        const lastTimeEl = document.getElementById("last");
        if (lastTimeEl && res.lastBlockedDate) {
          lastTimeEl.textContent = formatLastTime(res.lastBlockedDate);
        }

        // Hiển thị trạng thái
        const note = document.getElementById("note");
        const focusBtn = document.getElementById("start-focus");

        if (inFocus) {
          if (note) {
            note.textContent =
              "Bạn đang bật chế độ tập trung, hãy quay lại làm việc.";
          }

          if (focusBtn) {
            focusBtn.textContent = "⏳ Đang tập trung...";
            focusBtn.disabled = true;
          }
        } else {
          if (focusBtn) {
            focusBtn.textContent = "🎯 Tập trung 25 phút";
            focusBtn.disabled = false;
          }
        }
      });
    }
  );

  // Nút quay lại
  const backBtn = document.getElementById("back");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.history.back();
    });
  }

  // Nút bật phiên tập trung
  const focusBtn = document.getElementById("start-focus");
  if (focusBtn) {
    focusBtn.addEventListener("click", () => {
      if (focusBtn.disabled) return;

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
          // Tăng streak khi bắt đầu focus session
          chrome.storage.local.get(["currentStreak"], (res) => {
            const newStreak = (res.currentStreak || 0) + 1;
            chrome.storage.local.set({ currentStreak: newStreak });
          });

          focusBtn.textContent = "⏳ Đang tập trung...";
          focusBtn.disabled = true;

          setTimeout(() => {
            window.close();
          }, 500);
        }
      );
    });
  }
});
