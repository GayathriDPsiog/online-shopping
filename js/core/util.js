// ============================================================
// util.js — small helpers used everywhere: money, dates,
// escaping, validation, debounce.
// ============================================================
const Util = {
  // Folder prefix to reach the site root ('' for root pages, '../' for admin pages)
  root() {
    return document.body.dataset.root || '';
  },

  // ---- Money: always stored as integer paise ----
  inr(paise) {
    const rupees = (Number(paise) || 0) / 100;
    return '₹' + rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  // "499.5" → 49950. Returns NaN for invalid input. Never uses float multiplication.
  toPaise(text) {
    const s = String(text).trim();
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
    const parts = s.split('.');
    const paisePart = ((parts[1] || '') + '00').slice(0, 2);
    return parseInt(parts[0], 10) * 100 + parseInt(paisePart, 10);
  },
  // 49950 → "499.50" (for filling edit forms)
  toRupeesText(paise) {
    return ((Number(paise) || 0) / 100).toFixed(2);
  },

  // ---- Safety: escape user text before putting it into HTML ----
  esc(value) {
    return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  },

  // ---- Dates ----
  fmtDate(d) {
    if (!d) return '-';
    const x = d instanceof Date ? d : new Date(d);
    return x.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  fmtDay(d) {
    if (!d) return '-';
    const x = d instanceof Date ? d : new Date(d);
    return x.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  // Date → "YYYY-MM-DD" in local (India) time, for <input type="date">
  ymd(d) {
    const x = d || new Date();
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const day = String(x.getDate()).padStart(2, '0');
    return x.getFullYear() + '-' + m + '-' + day;
  },
  // "YYYY-MM-DD" → start / end of that day in local time (end is inclusive)
  dayStart(ymd) { return new Date(ymd + 'T00:00:00'); },
  dayEnd(ymd) { return new Date(ymd + 'T23:59:59.999'); },

  // ---- Misc ----
  qs(name) {
    return new URLSearchParams(location.search).get(name);
  },
  debounce(fn, ms) {
    let timer;
    return function () {
      const args = arguments, self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  },
  // Stable colour for a product tile, based on a string
  hue(str) {
    let h = 0;
    for (let i = 0; i < String(str).length; i++) h = (h * 31 + String(str).charCodeAt(i)) % 360;
    return h;
  },

  // ---- Product images ----
  // Full https URLs are used as-is; a path like "images/mouse.jpg" (a file in this
  // project) gets the right folder prefix so it also works from admin pages.
  imgSrc(url) {
    if (!url) return '';
    return /^https:\/\//i.test(url) ? url : Util.root() + url;
  },
  // All image URLs of a product. New products use "images" (a list);
  // older ones may only have a single "imageUrl".
  imagesOf(p) {
    if (p && Array.isArray(p.images) && p.images.length) return p.images;
    return p && p.imageUrl ? [p.imageUrl] : [];
  },
  // Main image with a fallback: if the URL is empty or broken, the coloured letter tile shows instead
  productImage(p, cls) {
    const letter = Util.esc((p.title || '?').charAt(0).toUpperCase());
    const first = Util.imagesOf(p)[0];
    const img = first
      ? '<img src="' + Util.esc(Util.imgSrc(first)) + '" alt="' + Util.esc(p.title) + '" loading="lazy" onerror="this.remove()">'
      : '';
    return '<div class="' + cls + '" style="background:hsl(' + Util.hue(p.catId || p.id) + ',45%,48%)"><span>' + letter + '</span>' + img + '</div>';
  },

  // ---- Validation rules ----
  valid: {
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); },
    mobile: function (v) { return /^[6-9]\d{9}$/.test(v); },            // Indian 10-digit mobile
    name: function (v) { return /^[A-Za-z][A-Za-z .'-]{1,49}$/.test(v); }, // letters, 2–50 chars
    password: function (v) { return typeof v === 'string' && v.length >= 6; },
    wholeNumber: function (v) { return /^\d+$/.test(String(v).trim()); },
    // Empty (optional), an https:// link, or a project file path like images/mouse.jpg
    imageUrl: function (v) { return v === '' || (/^(https:\/\/[^\s"'<>]+|images\/[\w\-.\/]+)$/i.test(v) && v.length <= 1000); }
  }
};
