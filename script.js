// SpeakSafe demo logic. Nothing leaves the browser: cases are kept in this
// browser's localStorage only, so a code can be checked again on the same device.

(function () {
  'use strict';

  // ---------- Mobile menu ----------
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');

  function setMenu(open) {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  toggle.addEventListener('click', function () {
    setMenu(!nav.classList.contains('open'));
  });
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMenu(false);
  });

  // ---------- Flowchart: open full size ----------
  var flowImg = document.querySelector('.flowchart img');
  if (flowImg) {
    flowImg.addEventListener('click', function () {
      window.open(flowImg.src, '_blank', 'noopener');
    });
  }

  // ---------- Storage helpers (fail quietly) ----------
  var STORE = 'speaksafe-demo-cases';
  function loadCases() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; }
  }
  function saveCase(code, data) {
    try {
      var all = loadCases();
      all[code] = data;
      localStorage.setItem(STORE, JSON.stringify(all));
    } catch (e) { /* storage unavailable: demo still works for this visit */ }
  }

  // ---------- Case Reference Code ----------
  function makeCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I
    var buf = new Uint32Array(8);
    (window.crypto || window.msCrypto).getRandomValues(buf);
    var s = '';
    for (var i = 0; i < 8; i++) s += chars.charAt(buf[i] % chars.length);
    return 'SS-' + s.slice(0, 4) + '-' + s.slice(4);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- Report form ----------
  var form = document.getElementById('report-form');
  var errorBox = document.getElementById('form-error');
  var result = document.getElementById('report-result');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = new FormData(form);
    var category = data.get('category');
    var details = (data.get('details') || '').trim();

    if (!category || details.length < 10) {
      errorBox.textContent = !category
        ? 'Please choose what kind of problem it is.'
        : 'Please describe what happened (at least a sentence).';
      errorBox.hidden = false;
      return;
    }
    errorBox.hidden = true;

    var urgentFlags = data.getAll('urgent');
    var urgent = urgentFlags.length > 0 || category === 'Physical Safety';
    var code = makeCode();
    var record = { category: category, urgent: urgent, created: Date.now() };
    saveCase(code, record);

    var next = urgent
      ? 'Your report is <strong>urgent</strong>. An independent investigator will start within <strong>48 hours</strong>.'
      : 'An independent reviewer will read your report within <strong>1 working day</strong>. It is also logged, so repeated reports about the same supervisor trigger an audit.';

    result.innerHTML =
      '<h3>Report received (demo)</h3>' +
      '<p>Save this code. It is the only way to check your case, answer questions or add evidence.</p>' +
      '<div class="code-box"><code id="case-code">' + code + '</code>' +
      '<button type="button" id="copy-code">Copy</button></div>' +
      '<p><span class="tag ' + (urgent ? 'tag-urgent' : 'tag-normal') + '">' +
        (urgent ? 'Urgent' : 'Standard') + '</span>' +
        '<span class="tag tag-normal">' + escapeHtml(category) + '</span></p>' +
      '<p>' + next + '</p>' +
      '<p>Support: you can contact TAFEP for advice at any time. In an emergency, call 999.</p>';

    result.hidden = false;
    form.reset();
    result.focus();
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });

    document.getElementById('copy-code').addEventListener('click', function (ev) {
      var btn = ev.currentTarget;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(function () { btn.textContent = 'Copied'; },
          function () { btn.textContent = 'Copy failed'; });
      } else {
        btn.textContent = 'Select and copy';
      }
    });
  });

  // ---------- Track form ----------
  var trackForm = document.getElementById('track-form');
  var trackResult = document.getElementById('track-result');
  var STAGES = [
    'Report received and anonymised',
    'Triage by the independent third party',
    'Investigation',
    'Outcome decided',
    '90-day anti-retaliation watch',
    'Case closed'
  ];

  trackForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var code = (new FormData(trackForm).get('code') || '').trim().toUpperCase();
    var cases = loadCases();
    var rec = cases[code];

    if (!rec) {
      trackResult.innerHTML =
        '<h3>No case found</h3>' +
        '<p>We could not find <strong>' + escapeHtml(code || 'that code') + '</strong> on this device. ' +
        'In this demo, codes are only kept in the browser where the report was made. Check the code and try again.</p>';
      trackResult.hidden = false;
      return;
    }

    // Demo progress: move one stage forward per minute since the report.
    var mins = Math.floor((Date.now() - rec.created) / 60000);
    var stage = Math.min(1 + mins, STAGES.length - 1);
    var items = STAGES.map(function (s, i) {
      var cls = i < stage ? 'done' : (i === stage ? 'now' : '');
      return '<li class="' + cls + '">' + s + (i === stage ? ' (current)' : '') + '</li>';
    }).join('');

    trackResult.innerHTML =
      '<h3>Case ' + escapeHtml(code) + '</h3>' +
      '<p><span class="tag ' + (rec.urgent ? 'tag-urgent' : 'tag-normal') + '">' +
        (rec.urgent ? 'Urgent' : 'Standard') + '</span>' +
        '<span class="tag tag-normal">' + escapeHtml(rec.category) + '</span></p>' +
      '<ol class="timeline">' + items + '</ol>' +
      '<p class="stat-src">Demo only: progress moves forward one stage per minute.</p>';
    trackResult.hidden = false;
  });
})();
