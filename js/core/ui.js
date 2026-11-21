// ============================================================
// ui.js — reusable interface pieces: header, toasts, modals,
// confirm dialogs, pagination, tables, badges, form errors.
// ============================================================
const Ui = {

  // ---------- Header / navigation ----------
  renderHeader() {
    const r = Util.root();
    const u = Auth.user();
    const admin = Auth.isAdmin();
    const page = document.body.dataset.page;
    let links;
    if (admin) {
      links = [['admin/index.html', 'Dashboard', 'dashboard'], ['admin/categories.html', 'Categories', 'categories'],
        ['admin/products.html', 'Products', 'products'], ['admin/customers.html', 'Customers', 'customers'],
        ['admin/reports.html', 'Reports', 'reports']];
    } else {
      links = [['index.html', 'Shop', 'shop']];
      if (u) links.push(['orders.html', 'My orders', 'orders'], ['profile.html', 'Profile', 'profile']);
    }
    const nav = links.map(function (l) {
      return '<a href="' + r + l[0] + '" class="' + (page === l[2] ? 'active' : '') + '">' + l[1] + '</a>';
    }).join('');

    let right = '';
    if (!admin) {
      right += '<a class="cart-link ' + (page === 'cart' ? 'active' : '') + '" href="' + r + 'cart.html">Cart <span class="cart-count" id="cartCount">0</span></a>';
    }
    if (u) {
      right += '<span class="who" title="' + Util.esc(u.email) + '">' + (admin ? 'Admin' : Util.esc(u.email.split('@')[0])) + '</span>';
      right += '<button class="btn btn-ghost btn-sm" id="logoutBtn">Log out</button>';
    } else {
      right += '<a class="btn btn-ghost btn-sm" href="' + r + 'login.html">Sign in</a>';
      right += '<a class="btn btn-primary btn-sm" href="' + r + 'signup.html">Sign up</a>';
    }

    $('#app-header').html(
      '<div class="container header-inner">' +
        '<a class="brand" href="' + r + (admin ? 'admin/index.html' : 'index.html') + '"><span class="brand-mark">O</span>OnlineShop' + (admin ? '<span class="brand-tag">Admin</span>' : '') + '</a>' +
        '<button class="menu-toggle" id="menuToggle" aria-label="Menu">☰</button>' +
        '<nav class="nav" id="mainNav">' + nav + '</nav>' +
        '<div class="header-right">' + right + '</div>' +
      '</div>'
    );
    $('#logoutBtn').on('click', function () { Auth.logout(); });
    $('#menuToggle').on('click', function () { $('#mainNav').toggleClass('open'); });
    Ui.updateCartCount();
  },

  updateCartCount() {
    if (typeof Cart !== 'undefined') {
      const n = Cart.count();
      $('#cartCount').text(n).toggleClass('has-items', n > 0);
    }
  },

  // ---------- Toast messages ----------
  toast(message, type, actionLabel, onAction) {
    if (!$('#toast-root').length) $('body').append('<div id="toast-root"></div>');
    const $t = $('<div class="toast"></div>').addClass('toast-' + (type || 'info'));
    $t.append($('<span></span>').text(message));
    if (actionLabel) {
      const $a = $('<button class="toast-action"></button>').text(actionLabel);
      $a.on('click', function () { onAction(); $t.remove(); });
      $t.append($a);
    }
    $('#toast-root').append($t);
    setTimeout(function () { $t.addClass('show'); }, 10);
    setTimeout(function () {
      $t.removeClass('show');
      setTimeout(function () { $t.remove(); }, 300);
    }, type === 'error' ? 6000 : (actionLabel ? 5000 : 3000));
    return $t;
  },

  // ---------- Loading state on buttons (prevents double clicks) ----------
  busy($btn, on) {
    if (on) {
      $btn.data('label', $btn.html()).prop('disabled', true).html('<span class="spinner"></span>');
    } else {
      $btn.prop('disabled', false).html($btn.data('label'));
    }
  },

  // ---------- Modal dialog with a form ----------
  modal(opts) {
    const $m = $(
      '<div class="modal-overlay"><div class="modal" role="dialog" aria-modal="true">' +
        '<div class="modal-head"><h3></h3><button class="icon-btn" data-close aria-label="Close">×</button></div>' +
        '<div class="modal-body"></div>' +
        '<div class="modal-foot"><button class="btn btn-ghost" data-close></button><button class="btn btn-primary" data-ok></button></div>' +
      '</div></div>'
    );
    $m.find('h3').text(opts.title);
    $m.find('.modal-body').html(opts.body);
    $m.find('[data-ok]').text(opts.okText || 'Save');
    $m.find('.modal-foot [data-close]').text(opts.cancelText || 'Cancel');
    $('body').append($m).addClass('no-scroll');
    function close() {
      $m.remove();
      $('body').removeClass('no-scroll');
      $(document).off('keydown.modal');
    }
    $m.on('click', '[data-close]', close);
    $m.on('mousedown', function (e) { if (e.target === $m[0]) close(); });
    $(document).on('keydown.modal', function (e) { if (e.key === 'Escape') close(); });
    $m.find('[data-ok]').on('click', async function () {
      const $b = $(this);
      Ui.busy($b, true);
      try {
        const result = await opts.onOk($m);
        if (result !== false) close();
      } catch (err) {
        Ui.toast(err.message, 'error');
      } finally {
        if (document.body.contains($b[0])) Ui.busy($b, false);
      }
    });
    $m.find('form').on('submit', function (e) { e.preventDefault(); $m.find('[data-ok]').trigger('click'); });
    setTimeout(function () { $m.find('input:not([readonly]),select,textarea').first().trigger('focus'); }, 50);
    return { $el: $m, close: close };
  },

  // ---------- Yes / No confirmation (returns a Promise<boolean>) ----------
  confirm(message, okText, danger) {
    return new Promise(function (resolve) {
      const $m = $(
        '<div class="modal-overlay"><div class="modal modal-sm" role="alertdialog" aria-modal="true">' +
          '<div class="modal-head"><h3>Please confirm</h3></div>' +
          '<div class="modal-body"><p></p></div>' +
          '<div class="modal-foot"><button class="btn btn-ghost" data-no>No</button><button class="btn" data-yes></button></div>' +
        '</div></div>'
      );
      $m.find('p').text(message);
      $m.find('[data-yes]').text(okText || 'Yes').addClass(danger === false ? 'btn-primary' : 'btn-danger');
      $('body').append($m);
      function done(v) { $m.remove(); resolve(v); }
      $m.find('[data-no]').on('click', function () { done(false); });
      $m.find('[data-yes]').on('click', function () { done(true); });
      setTimeout(function () { $m.find('[data-no]').trigger('focus'); }, 50);
    });
  },

  // ---------- Pagination ----------
  paginate(list, page, size) {
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / size));
    page = Math.min(Math.max(1, page), totalPages);
    const startIdx = (page - 1) * size;
    return {
      items: list.slice(startIdx, startIdx + size),
      page: page, totalPages: totalPages, total: total,
      start: total ? startIdx + 1 : 0,
      end: Math.min(startIdx + size, total)
    };
  },
  pager($el, info, onChange) {
    if (info.totalPages <= 1) { $el.empty(); return; }
    let html = '<button class="btn btn-ghost btn-sm" data-p="' + (info.page - 1) + '"' + (info.page === 1 ? ' disabled' : '') + '>‹ Prev</button>';
    for (let i = 1; i <= info.totalPages; i++) {
      const far = Math.abs(i - info.page) > 2 && i !== 1 && i !== info.totalPages;
      if (info.totalPages > 7 && far) {
        if (i === 2 || i === info.totalPages - 1) html += '<span class="ellipsis">…</span>';
        continue;
      }
      html += '<button class="btn btn-sm ' + (i === info.page ? 'btn-primary' : 'btn-ghost') + '" data-p="' + i + '">' + i + '</button>';
    }
    html += '<button class="btn btn-ghost btn-sm" data-p="' + (info.page + 1) + '"' + (info.page === info.totalPages ? ' disabled' : '') + '>Next ›</button>';
    $el.html(html).off('click').on('click', 'button[data-p]', function () { onChange(+$(this).data('p')); });
  },

  // ---------- Tables ----------
  table(cols, rows, emptyMsg) {
    if (!rows.length) return Ui.empty(emptyMsg || 'No records found.');
    const head = cols.map(function (c) { return '<th class="' + (c.cls || '') + '">' + c.label + '</th>'; }).join('');
    const body = rows.map(function (row, i) {
      return '<tr>' + cols.map(function (c) { return '<td class="' + (c.cls || '') + '" data-label="' + c.label + '">' + c.render(row, i) + '</td>'; }).join('') + '</tr>';
    }).join('');
    return '<div class="table-wrap"><table class="table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  },

  // ---------- Small pieces ----------
  empty(message, actionHtml) {
    return '<div class="empty"><div class="empty-icon">∅</div><p>' + Util.esc(message) + '</p>' + (actionHtml || '') + '</div>';
  },
  skeleton(count, cls) {
    let html = '';
    for (let i = 0; i < count; i++) html += '<div class="skeleton ' + (cls || '') + '"></div>';
    return html;
  },
  stockBadge(qty, forAdmin) {
    if (qty <= 0) return '<span class="badge badge-danger">Out of stock</span>';
    if (qty < CONFIG.LOW_STOCK) return '<span class="badge badge-warn">' + (forAdmin ? 'Low · ' + qty : 'Only ' + qty + ' left') + '</span>';
    if (forAdmin && qty > CONFIG.HIGH_STOCK) return '<span class="badge badge-info">High · ' + qty + '</span>';
    return '<span class="badge badge-ok">' + (forAdmin ? 'In stock · ' + qty : 'In stock') + '</span>';
  },
  statusBadge(active) {
    return active === false ? '<span class="badge badge-muted">Inactive</span>' : '<span class="badge badge-ok">Active</span>';
  },
  creditMeter(limit, used, pending) {
    limit = limit || 0; used = used || 0; pending = pending || 0;
    if (limit <= 0) return '<div class="meter-text">No credit limit assigned. Contact the store to request credit.</div>';
    const pct = Math.min(100, Math.round((used + pending) / limit * 100));
    const over = used + pending > limit;
    return '<div class="meter-text"><span>Used ' + Util.inr(used + pending) + ' of ' + Util.inr(limit) + '</span><span>Available ' + Util.inr(Math.max(0, limit - used - pending)) + '</span></div>' +
      '<div class="meter"><div class="meter-fill' + (over ? ' over' : '') + '" style="width:' + pct + '%"></div></div>';
  },

  // ---------- Form errors ----------
  fieldError($input, msg) {
    $input.addClass('invalid').closest('.field').find('.field-error').text(msg);
  },
  clearErrors($scope) {
    $scope.find('.invalid').removeClass('invalid');
    $scope.find('.field-error').text('');
  }
};

// Clear a field's error as soon as the user edits it
$(document).on('input change', '.invalid', function () {
  $(this).removeClass('invalid').closest('.field').find('.field-error').text('');
});
