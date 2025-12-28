function render(list) {
  const el = document.getElementById("defaults");
  el.innerHTML = "";
  if (!list || !list.length) {
    const p = document.createElement("p");
    p.style.color = "#94a3b8";
    p.textContent = "Không có dữ liệu mặc định.";
    el.appendChild(p);
    return;
  }
  list.forEach((d) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.className = "domain";
    span.textContent = d;
    const btn = document.createElement("button");
    btn.className = "copy";
    btn.textContent = "Sao chép";
    btn.addEventListener("click", () => {
      navigator.clipboard.writeText(d).then(() => {
        btn.textContent = "Đã sao chép";
        setTimeout(() => (btn.textContent = "Sao chép"), 1500);
      });
    });
    li.appendChild(span);
    li.appendChild(btn);
    el.appendChild(li);
  });
}

function parseRulesJson(json) {
  if (!Array.isArray(json)) return [];
  return json
    .map((it) => {
      const f = it && it.condition && it.condition.urlFilter;
      if (!f) return null;
      return f.replace(/^\|\|/, "").replace(/\^$/, "");
    })
    .filter(Boolean);
}

function loadDefaultsFallback() {
  return fetch(chrome.runtime.getURL("rules.json"))
    .then((r) => r.json())
    .then((json) => parseRulesJson(json))
    .catch((e) => {
      console.warn("Failed to load rules.json", e);
      return [];
    });
}

// Try background message first, fallback to rules.json if missing
(function () {
  const status = document.createElement("div");
  status.id = "defaults-status";
  status.style.color = "#94a3b8";
  status.style.marginTop = "8px";
  status.textContent = "Đang tải danh sách...";
  document.querySelector(".card").appendChild(status);

  try {
    chrome.runtime.sendMessage({ action: "getBlockedList" }, function (res) {
      if (res && Array.isArray(res.defaults) && res.defaults.length) {
        status.remove();
        return render(res.defaults);
      }
      loadDefaultsFallback().then((list) => {
        status.remove();
        render(list);
      });
    });
  } catch (e) {
    // messaging failed — fallback
    loadDefaultsFallback().then((list) => {
      const st = document.getElementById("defaults-status");
      if (st) st.remove();
      render(list);
    });
  }
})();

document
  .getElementById("close")
  .addEventListener("click", () => window.close());
