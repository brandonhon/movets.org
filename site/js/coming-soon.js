// "Coming Soon" popup for placeholder links
// Attach to any element with class="coming-soon"

(function () {
  function showComingSoon(e) {
    e.preventDefault();

    var existing = document.getElementById('coming-soon-popup');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'coming-soon-popup';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(14,18,30,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;';

    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:16px;padding:40px;max-width:420px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);';

    var icon = document.createElement('div');
    icon.style.cssText = 'margin-bottom:16px;text-align:center;';
    var img = document.createElement('img');
    img.src = 'icons/coming-soon.png';
    img.alt = 'Coming Soon';
    img.width = 56;
    img.height = 56;
    img.style.cssText = 'display:inline;';
    icon.appendChild(img);

    var heading = document.createElement('h3');
    heading.style.cssText = 'font-size:22px;font-weight:700;color:#0E121E;margin-bottom:12px;';
    heading.textContent = 'Coming Soon';

    var msg = document.createElement('p');
    msg.style.cssText = 'font-size:16px;line-height:26px;color:#53565E;margin-bottom:24px;';
    msg.textContent = 'Follow us for updates on HB2089 and veteran advocacy in Missouri.';

    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Got it';
    closeBtn.style.cssText = 'background:#FF344C;color:#fff;border:none;padding:12px 32px;border-radius:80px;font-size:16px;font-weight:600;cursor:pointer;';

    function close() { overlay.remove(); }
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (ev) { if (ev.target === overlay) close(); });

    box.appendChild(icon);
    box.appendChild(heading);
    box.appendChild(msg);
    box.appendChild(closeBtn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  document.querySelectorAll('.coming-soon').forEach(function (el) {
    el.addEventListener('click', showComingSoon);
  });
})();
