// Blocked page logic (Day 2): increment violationCount, reset streak for today, store lastBlockedDate, and improve UI
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

document.addEventListener('DOMContentLoaded', function () {
  chrome.storage.local.get(['violationCount','currentStreak','lastBlockedDate'], function (res) {
    var count = (res.violationCount || 0) + 1;
    var today = todayStr();

    // On a blocked attempt, reset streak
    var newStreak = 0;

    chrome.storage.local.set({ violationCount: count, currentStreak: newStreak, lastBlockedDate: today }, function () {
      var el = document.getElementById('count');
      if (el) el.textContent = count;

      var stEl = document.getElementById('streak');
      if (stEl) stEl.textContent = newStreak;

      var lastEl = document.getElementById('last');
      if (lastEl) lastEl.textContent = '📅 Lần gần nhất: ' + today;
    });

    // Try to show attempted page (may be available via document.referrer)
    var ref = document.referrer || '';
    if (ref) {
      try {
        var host = (new URL(ref)).host.replace('www.','');
        var note = document.getElementById('note');
        if (note) note.textContent = 'Bạn đã cố truy cập: ' + host + ' — chúng tôi đã ghi lại lần này.';
      } catch(e) {
        // ignore parse errors
      }
    }
  });

  // Back button closes the tab
  var btn = document.getElementById('back');
  if (btn) btn.addEventListener('click', function () { window.close(); });

  // Start focus session button just closes and sets a flag (Day 4 we'll add timers)
  var focusBtn = document.getElementById('start-focus');
  if (focusBtn) focusBtn.addEventListener('click', function () {
    focusBtn.textContent = 'Đang bắt đầu…';
    setTimeout(() => { window.close(); }, 600);
  });
});
