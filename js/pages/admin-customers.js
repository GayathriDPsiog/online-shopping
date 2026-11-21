// ============================================================
// admin-customers.js — CRUD on customer credit limits
// (set / change / remove = 0) and block / unblock.
// ============================================================
$(async function () {
  if (!Auth.requireAdmin()) return;
  Ui.renderHeader();

  let customers = [], page = 1;

  async function load() {
    $('#list').html(Ui.skeleton(6, 'row-sk'));
    try {
      customers = await Customers.list();
      render();
    } catch (e) {
      $('#list').html(Ui.empty('Could not load customers: ' + e.message));
    }
  }

  function render() {
    const q = $('#search').val().trim().toLowerCase();
    const f = $('#creditFilter').val();
    const list = customers.filter(function (c) {
      if (q && [c.name, c.email, c.mobile].join(' ').toLowerCase().indexOf(q) === -1) return false;
      if (f === 'with' && !(c.creditLimit > 0)) return false;
      if (f === 'without' && c.creditLimit > 0) return false;
      if (f === 'blocked' && c.active !== false) return false;
      return true;
    });
    const info = Ui.paginate(list, page, CONFIG.PAGE_SIZE);
    page = info.page;
    $('#resultInfo').text(info.total ? 'Showing ' + info.start + '–' + info.end + ' of ' + info.total : '');
    $('#list').html(Ui.table([
      { label: 'Customer', render: function (c) { return '<strong>' + Util.esc(c.name) + '</strong><div class="muted small">' + Util.esc(c.email) + '</div>'; } },
      { label: 'Mobile', render: function (c) { return Util.esc(c.mobile || '-'); } },
      { label: 'Credit limit', cls: 'right', render: function (c) { return Util.inr(c.creditLimit); } },
      { label: 'Used', cls: 'right', render: function (c) { return Util.inr(c.creditUsed); } },
      { label: 'Available', cls: 'right', render: function (c) { return '<strong>' + Util.inr(Customers.available(c)) + '</strong>'; } },
      { label: 'Status', render: function (c) { return c.active === false ? '<span class="badge badge-danger">Blocked</span>' : '<span class="badge badge-ok">Active</span>'; } },
      { label: 'Actions', render: function (c) {
        return '<div class="actions"><button class="btn-link" data-act="credit" data-id="' + c.id + '">Credit limit</button>' +
          '<button class="btn-link' + (c.active === false ? '' : ' danger') + '" data-act="toggle" data-id="' + c.id + '">' + (c.active === false ? 'Unblock' : 'Block') + '</button></div>';
      } }
    ], info.items, customers.length ? 'No customers match.' : 'No customers have signed up yet.'));
    Ui.pager($('#pager'), info, function (p) { page = p; render(); });
  }

  $('#list').on('click', 'button[data-act]', async function () {
    const id = $(this).attr('data-id');
    const c = customers.find(function (x) { return x.id === id; });

    if ($(this).attr('data-act') === 'credit') {
      Ui.modal({
        title: 'Credit limit · ' + c.name, okText: 'Save limit',
        body: '<form novalidate>' + Ui.creditMeter(c.creditLimit, c.creditUsed, 0) +
          '<div class="field" style="margin-top:14px"><label for="fLimit">New credit limit (₹)</label>' +
          '<input id="fLimit" inputmode="decimal" value="' + Util.toRupeesText(c.creditLimit) + '">' +
          '<div class="hint">Between ' + Util.inr(c.creditUsed) + ' (already used) and ' + Util.inr(CONFIG.MAX_CREDIT_LIMIT || 100000) + ' (maximum). Enter 0 to remove credit.</div>' +
          '<div class="field-error"></div></div></form>',
        onOk: async function ($m) {
          Ui.clearErrors($m);
          const $in = $m.find('#fLimit');
          const limit = Util.toPaise($in.val());
          if (isNaN(limit)) { Ui.fieldError($in, 'Enter an amount like 1000 or 1000.00.'); return false; }
          try { await Customers.setCreditLimit(c, limit); }
          catch (err) { Ui.fieldError($in, err.message); return false; }
          Ui.toast('Credit limit for ' + c.name + ' set to ' + Util.inr(limit), 'success');
          await load();
        }
      });
      return;
    }

    const block = c.active !== false;
    const ok = await Ui.confirm((block ? 'Block ' : 'Unblock ') + c.name + '?' + (block ? ' They will not be able to sign in or place orders.' : ''), block ? 'Block' : 'Unblock', block);
    if (!ok) return;
    try {
      await Customers.setActive(c.id, !block);
      Ui.toast(c.name + (block ? ' blocked' : ' unblocked'), 'success');
      await load();
    } catch (err) { Ui.toast(err.message, 'error'); }
  });

  $('#search').on('input', Util.debounce(function () { page = 1; render(); }, 250));
  $('#creditFilter').on('change', function () { page = 1; render(); });
  load();
});
