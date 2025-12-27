// Popup (Day 3): show counts/last date and allow add/remove blocked domains via background
function refreshCounts() {
  chrome.storage.local.get(
    [
      "violationCount",
      "currentStreak",
      "lastBlockedDate",
      "streakLastUpdatedDate",
    ],
    function (res) {
      document.getElementById("count").textContent = res.violationCount || 0;
      document.getElementById("streak").textContent =
        "🔥 Streak: " + (res.currentStreak || 0);
      var last = res.lastBlockedDate || "—";
      var lastEl = document.getElementById("last");
      if (!lastEl) {
        lastEl = document.createElement("div");
        lastEl.id = "last";
        lastEl.style.marginTop = "6px";
        lastEl.style.color = "#666";
        document.querySelector("body").appendChild(lastEl);
      }
      lastEl.textContent = "📅 Lần gần nhất: " + last;

      var sChecked = res.streakLastUpdatedDate || "—";
      var chkEl = document.getElementById("streak-checked");
      if (!chkEl) {
        chkEl = document.createElement("div");
        chkEl.id = "streak-checked";
        chkEl.style.marginTop = "6px";
        chkEl.style.color = "#666";
        chkEl.style.fontSize = "12px";
        document.querySelector("body").appendChild(chkEl);
      }
      chkEl.textContent = "✅ Streak last checked: " + sChecked;
    }
  );
}

function refreshList() {
  chrome.runtime.sendMessage({ action: "getBlockedList" }, function (res) {
    if (!res) return;
    const listEl = document.getElementById("list");
    listEl.innerHTML = "";

    const defaults = res.defaults || [];
    const user = res.userBlocked || [];

    // show defaults first
    defaults.forEach((d) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.padding = "4px 0";
      row.innerHTML =
        '<div style="color:#333">' +
        d +
        ' <span style="color:#888;font-size:12px">(mặc định)</span></div>';
      listEl.appendChild(row);
    });

    // show user-added with remove buttons
    user.forEach((d) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.padding = "4px 0";
      const name = document.createElement("div");
      name.textContent = d;
      const btn = document.createElement("button");
      btn.textContent = "X";
      btn.style.marginLeft = "8px";
      btn.title = "Remove";
      btn.addEventListener("click", function () {
        btn.disabled = true;
        btn.textContent = "…";
        chrome.runtime.sendMessage(
          { action: "removeDomain", domain: d },
          function (resp) {
            if (resp && resp.ok) refreshList();
            else {
              alert("Không thể xóa: " + (resp && resp.error));
              btn.disabled = false;
              btn.textContent = "X";
            }
          }
        );
      });
      row.appendChild(name);
      row.appendChild(btn);
      listEl.appendChild(row);
    });

    if (defaults.length + user.length === 0) {
      listEl.textContent = "Danh sách trống.";
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  refreshCounts();
  refreshList();

  // Listen for storage changes so numbers update instantly while popup is open
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === "local") {
      refreshCounts();
      refreshList();
    }
  });

  document.getElementById("add").addEventListener("click", function () {
    var site = document.getElementById("site").value.trim();
    if (!site) return alert("Nhập domain (ví dụ: example.com)");
    document.getElementById("add").disabled = true;
    chrome.runtime.sendMessage(
      { action: "addDomain", domain: site },
      function (resp) {
        document.getElementById("add").disabled = false;
        if (resp && resp.ok) {
          document.getElementById("site").value = "";
          refreshList();
        } else {
          alert("Không thể thêm: " + (resp && resp.error));
        }
      }
    );
  });
});
