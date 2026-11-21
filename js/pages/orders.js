// ============================================================
// orders.js (page) — the customer's order history.
// ============================================================
$(async function () {
  if (!Auth.requireCustomer()) return;
  Ui.renderHeader();

  $('#list').html(Ui.skeleton(5, 'row-sk'));
  let orders;
  try {
    orders = await Orders.mine();
  } catch (e) {
    $('#list').html(Ui.empty('Could not load orders: ' + e.message));
    return;
  }

  const spent = orders.reduce(function (s, o) { return s + o.total; }, 0);
  const creditSpent = orders.filter(function (o) { return o.payMode === 'credit'; }).reduce(function (s, o) { return s + o.total; }, 0);
  $('#kpis').html(
    '<div class="kpi"><div class="kpi-label">Orders</div><div class="kpi-value">' + orders.length + '</div></div>' +
    '<div class="kpi"><div class="kpi-label">Total spent</div><div class="kpi-value">' + Util.inr(spent) + '</div></div>' +
    '<div class="kpi"><div class="kpi-label">Paid by credit</div><div class="kpi-value">' + Util.inr(creditSpent) + '</div></div>'
  );

  let page = 1;
  function render() {
    const info = Ui.paginate(orders, page, CONFIG.PAGE_SIZE);
    page = info.page;
    $('#list').html(Ui.table([
      { label: 'Bill no.', render: function (o) { return '<span class="mono">' + Util.esc(o.id) + '</span>'; } },
      { label: 'Date', render: function (o) { return Util.fmtDate(o.date); } },
      { label: 'Items', render: function (o) {
        const names = (o.items || []).map(function (i) { return i.title + ' ×' + i.qty; }).join(', ');
        return '<span title="' + Util.esc(names) + '">' + Util.esc(names.length > 60 ? names.slice(0, 60) + '…' : names) + '</span>';
      } },
      { label: 'Payment', render: function (o) { return o.payMode === 'credit' ? '<span class="badge badge-info">Credit</span>' : '<span class="badge badge-ok">Cash</span>'; } },
      { label: 'Total', cls: 'right', render: function (o) { return '<strong>' + Util.inr(o.total) + '</strong>'; } },
      { label: '', cls: 'right', render: function (o) { return '<a class="btn btn-ghost btn-sm" href="bill.html?id=' + encodeURIComponent(o.id) + '">View bill</a>'; } }
    ], info.items, 'You have not placed any orders yet.'));
    if (!orders.length) $('#list').append('<div style="text-align:center"><a class="btn btn-primary" href="index.html">Start shopping</a></div>');
    Ui.pager($('#pager'), info, function (p) { page = p; render(); });
  }
  render();
});
