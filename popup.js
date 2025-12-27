// Popup (Day 2): show counts and last blocked date; react to storage changes
function refresh() {
  chrome.storage.local.get(['violationCount','currentStreak','lastBlockedDate'], function(res){
    document.getElementById('count').textContent = (res.violationCount||0);
    document.getElementById('streak').textContent = '🔥 Streak: ' + (res.currentStreak||0);
    var last = res.lastBlockedDate || '—';
    var lastEl = document.getElementById('last');
    if (!lastEl) {
      lastEl = document.createElement('div');
      lastEl.id = 'last';
      lastEl.style.marginTop = '6px';
      lastEl.style.color = '#666';
      document.querySelector('body').appendChild(lastEl);
    }
    lastEl.textContent = '📅 Lần gần nhất: ' + last;
  });
}

document.addEventListener('DOMContentLoaded', function(){
  refresh();

  // Listen for storage changes so numbers update instantly while popup is open
  chrome.storage.onChanged.addListener(function(changes, area) {
    if (area === 'local') refresh();
  });

  document.getElementById('add').addEventListener('click', function(){
    var site = document.getElementById('site').value.trim();
    if (!site) return alert('Nhập domain (ví dụ: example.com)');
    alert('Ngày 3: sẽ thêm rule cho: ' + site);
  });
});
