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
        "🔥 " + (res.currentStreak || 0);
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
      const name = document.createElement("div");
      name.className = "item";
      name.textContent = d + " ";
      const note = document.createElement("span");
      note.style.color = "var(--muted)";
      note.style.fontSize = "12px";
      note.textContent = "(mặc định)";
      name.appendChild(note);
      row.appendChild(name);
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
      name.className = "item";
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

  const addBtn = document.getElementById("add");
  const siteInput = document.getElementById("site");
  function showInlineError(msg) {
    let err = document.getElementById("add-error");
    if (!err) {
      err = document.createElement("div");
      err.id = "add-error";
      err.style.color = "#f87171";
      err.style.marginTop = "8px";
      err.style.fontSize = "13px";
      // Insert after the add button in its parent to avoid NotFoundError when
      // the add button is not a direct child of <body>. Fallback to document.body.
      const parent = (addBtn && addBtn.parentNode) || document.body;
      parent.insertBefore(err, (addBtn && addBtn.nextSibling) || null);
    }
    err.textContent = msg;
  }

  addBtn.addEventListener("click", function () {
    const siteRaw = siteInput.value.trim();
    if (!siteRaw) return showInlineError("Nhập domain (ví dụ: example.com)");

    // normalize input to a bare host
    let domain = siteRaw
      .replace(/^(https?:\/\/)/i, "")
      .split("/")[0]
      .toLowerCase();
    if (domain.startsWith("www.")) domain = domain.slice(4);

    // basic validation
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain))
      return showInlineError("Domain không hợp lệ");

    addBtn.disabled = true;
    const prevText = addBtn.textContent;
    addBtn.textContent = "Đang thêm…";

    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      addBtn.disabled = false;
      addBtn.textContent = prevText;
      showInlineError("Không phản hồi — thử lại.");
    }, 6000);

    chrome.runtime.sendMessage(
      { action: "addDomain", domain: domain },
      function (resp) {
        clearTimeout(timeoutId);
        if (timedOut) return; // ignore late responses
        addBtn.disabled = false;
        addBtn.textContent = prevText;
        if (resp && resp.ok) {
          siteInput.value = "";
          const errEl = document.getElementById("add-error");
          if (errEl) errEl.remove();
          refreshList();
        } else {
          showInlineError("Không thể thêm: " + (resp && resp.error));
        }
      }
    );
  });
});
