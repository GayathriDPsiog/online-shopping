// ============================================================
// admin-dashboard.js — headline numbers, low stock, recent orders.
// ============================================================
$(async function () {
  if (!Auth.requireAdmin()) return;
  Ui.renderHeader();
  $('#today').text(new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  $('#kpis').html(Ui.skeleton(4, 'row-sk'));

  // One-click sample data (10 categories × 20 products)
  $('#seedBtn').on('click', async function () {
    const ok = await Ui.confirm('Add 10 categories and 184 products with real photos? Old sample products whose images did not load will be removed (or hidden if they appear in an order). Nothing is duplicated.', 'Load sample data', false);
    if (!ok) return;
    const $b = $(this);
    Ui.busy($b, true);
    try {
      const r = await Seed.run();
      Ui.toast('Added ' + r.categories + ' categories and ' + r.products + ' products' +
        (r.removed || r.deactivated ? '; cleaned up ' + (r.removed + r.deactivated) + ' old sample products' : ''), 'success');
      setTimeout(function () { location.reload(); }, 1200);
    } catch (err) {
      Ui.toast('Could not add sample data: ' + err.message, 'error');
      Ui.busy($b, false);
    }
  });

  let d;
  try {
    d = await Reports.loadAll();
  } catch (e) {
    $('#kpis').html(Ui.empty('Could not load data: ' + e.message));
    return;
  }

  const today = Util.ymd(new Date());
  const monthStart = today.slice(0, 8) + '01';
  const todays = Reports.inRange(d.orders, today, today);
  const month = Reports.inRange(d.orders, monthStart, today);
  const activeProducts = d.products.filter(function (p) { return p.active !== false; });
  const low = Reports.lowStock(activeProducts);
  const creditOut = Reports.sum(d.customers, 'creditUsed');

  function kpi(label, value, sub) {
    return '<div class="kpi"><div class="kpi-label">' + label + '</div><div class="kpi-value">' + value + '</div><div class="kpi-sub">' + (sub || '') + '</div></div>';
  }
  $('#kpis').html(
    kpi("Today's sales", Util.inr(Reports.sum(todays, 'total')), todays.length + ' order(s)') +
    kpi('This month', Util.inr(Reports.sum(month, 'total')), month.length + ' order(s)') +
    kpi('Products', activeProducts.length, d.products.length - activeProducts.length + ' inactive · ' + d.categories.length + ' categories') +
    kpi('Low stock', low.length, 'below ' + CONFIG.LOW_STOCK + ' units') +
    kpi('Customers', d.customers.length, 'Credit in use ' + Util.inr(creditOut))
  );

  const catName = {};
  d.categories.forEach(function (c) { catName[c.id] = c.name; });
  $('#lowStock').html(Ui.table([
    { label: 'Product', render: function (p) { return Util.esc(p.title); } },
    { label: 'Category', render: function (p) { return Util.esc(catName[p.catId] || '-'); } },
    { label: 'Stock', cls: 'right', render: function (p) { return Ui.stockBadge(p.qty, true); } }
  ], low.slice(0, 8), 'All products are well stocked.'));

  $('#recent').html(Ui.table([
    { label: 'Bill no.', render: function (o) { return '<a class="mono" href="../bill.html?id=' + encodeURIComponent(o.id) + '">' + Util.esc(o.id) + '</a>'; } },
    { label: 'Customer', render: function (o) { return Util.esc(o.customerName); } },
    { label: 'Pay', render: function (o) { return o.payMode === 'credit' ? 'Credit' : 'Cash'; } },
    { label: 'Total', cls: 'right', render: function (o) { return Util.inr(o.total); } }
  ], d.orders.slice(0, 6), 'No orders yet.'));
});
